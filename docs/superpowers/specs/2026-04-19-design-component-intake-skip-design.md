# Design-Component Intake Skip + components[] Naming

Date: 2026-04-19
Status: Draft (brainstorming)

## Motivation

Two coupled issues surfaced during the avatar test run on `drupal-petshop` (workflow `design-component-2026-04-18-d6f9`):

1. **Intake is a forced round-trip when the caller already has the full Component spec.** The avatar prompt fully specified name, slots, variants — yet the workflow required an `intake` stage just to forward those values into the `component` stage. The CLI invocation that spawns design-component (test fixtures, batch tooling, agent prompts) has no shortcut to bypass it.

2. **Outer/inner naming collision in `each:` declarations.** Today the intake result is `component: Component[]` and `create-component`'s `each:` reads `expr: "component"`. The same identifier `component` denotes the outer scope array AND the inner per-iteration binding. The lazy cross-product in `template/each.ts:24` happens to do the right thing because `combo` shadows the outer scope, but the latent collision is fragile — adding a third axis or renaming any binding is a footgun.

Both issues live in the same surface area (intake stage + create-component each: declarations). Fixing them together is cleaner than two separate passes.

## Scope

Two ordered workstreams under `.agents/skills/designbook/` and `.agents/skills/designbook-drupal/`:

### Step A — Rename `component[]` → `components[]` (no behavior change)

Pure naming refactor. Outer scope key becomes plural; inner per-iteration binding stays singular. Restores the standard outer-plural/inner-singular `each:` convention.

Touch points:

- `.agents/skills/designbook/design/tasks/intake--design-component.md` — `result.component` → `result.components`
- `.agents/skills/designbook/design/tasks/intake--design-shell.md` — same
- `.agents/skills/designbook/design/tasks/intake--design-screen.md` — same
- `.agents/skills/designbook-drupal/components/tasks/create-component.md` — `each.component.expr: "component"` → `expr: "components"`
- `.agents/skills/designbook-drupal/components/tasks/create-variant-story.md` — `each.component.expr: "component"` → `expr: "components"` (variant axis unchanged: still `expr: "component.variants"`, now reading the unambiguous inner binding)
- `.agents/skills/designbook/design/tasks/intake--design-component.md` body Step 5 wording (`component` iterable → `components` iterable)

No engine code changes. The `each:` resolution in `template/each.ts` already supports any outer/inner naming.

### Step B — Add `components: Component[]` workflow param + conditional intake skip

Affects only `design-component` (design-shell and design-screen produce more than `components[]` from intake — `output_path`, `entity_mappings`, etc. — so a clean skip isn't possible there).

Touch points:

- `.agents/skills/designbook/design/workflows/design-component.md` — add workflow param `components: { type: array, items: { $ref: ../schemas.yml#/Component } }`
- Engine — at workflow create (or first stage transition into `intake`), if `params.components` is present and non-empty, seed `data.scope.components = params.components` and produce zero intake tasks. The existing "stage with no tasks → keep walking" path in `workflow.ts:1354` then transitions directly to `component` stage; expansion picks up the seeded scope.

### Out of Scope

- Same skip feature for `design-shell` / `design-screen`. Their intake produces ancillary data (`output_path`, `entity_mappings`, `section_id`, `section_title`) that has no obvious caller-side substitute. Would need separate analysis.
- Single-form sugar `component: <Component>` that auto-wraps to `[it]`. Decided against — complicates schema, hides intent. Callers pass an array even for one item.
- Generalised "skip stage if scope already populated" engine feature. Each workflow knows its own intake contract; opt-in per workflow is clearer than implicit detection.
- New CLI flags. Skip is driven entirely by `--params components=...` (or workflow-level params via the existing mechanism).

## Architecture

### Naming convention restored

After Step A, `each:` declarations read uniformly:

```yaml
# create-component
each:
  component:
    expr: "components"          # outer plural array → bind inner 'component' singular
    schema: { $ref: designbook/design/schemas.yml#/Component }
```

```yaml
# create-variant-story
each:
  component:
    expr: "components"          # same outer
    schema: { $ref: designbook/design/schemas.yml#/Component }
  variant:
    expr: "component.variants"  # inner 'component' from previous binding → its variants
    schema: { $ref: designbook/design/schemas.yml#/Variant }
```

Outer (`components`) and inner (`component`) are now distinct identifiers. `component.variants` unambiguously refers to the just-bound singular component.

### Skip mechanism

The engine already has the primitive: `workflow.ts:1278-1328` expands stage tasks from `data.scope` at stage-transition time via `expandTasksFromParams`. The current intake stage seeds scope by *running* the intake task; the skip variant seeds scope from `params.components` instead.

Decision point at workflow create (`workflowCreate` in `workflow.ts:346`):

1. Resolve workflow params as today.
2. If `params.components` is present and validates against `Component[]`:
   - Skip intake task expansion (don't add the `intake` task to `data.tasks`).
   - Seed `data.scope.components = params.components`.
   - Set `data.current_stage = 'intake'` (so the stage-walk in `workflow done` still triggers; the stage has zero tasks → engine walks to `component` stage and expands from scope).
3. Otherwise: behave exactly as today (expand intake task, run interactive Q&A).

No changes to the `direct` engine. No new lifecycle states. The skip is a one-time decision at create-time; once the intake stage has zero tasks, the existing transition logic does the rest.

### Validation surface

`params.components` validates against the same `Component` schema the intake result uses today (`.agents/skills/designbook/design/schemas.yml#/Component`). A malformed param fails workflow create with the same AJV error path as a malformed intake submission would — no new error class.

## Risks

- **Existing tasks.yml files in flight.** Per `CLAUDE.md`: no migration code. Any in-flight workflow created before this change uses the old `component` scope key. Acceptable — workflows are short-lived, in-flight state is disposable. Test workspaces rebuild from scratch.
- **Test fixtures referencing `scope.component`.** Need to grep + update. Quick scan during implementation.
- **External callers of `_debo workflow done --data` for intake.** Submission body becomes `{ "components": [...] }` instead of `{ "component": [...] }`. Breaking — but only one workflow type and the integration is internal (designbook-test, agent prompts). Acceptable per "no compat shims" rule.

## Verification

End-to-end:

1. Petshop avatar test (existing fixture) re-runs after Step A — intake still works interactively, four create-* tasks expand correctly. Storybook renders all three variant stories.
2. New fixture `drupal-petshop/cases/design-component-skip-intake.yaml` — same avatar, but invoked with `--params components='[{...}]'`. Intake stage produces zero tasks; component stage expands directly. Storybook output identical to step 1.
3. `pnpm check` passes (typecheck + lint + test).

## Open Questions

None blocking. Engine-side decision point (Step B) needs the implementation plan to settle whether to inline the check in `workflowCreate` or extract a small helper — defer to writing-plans.
