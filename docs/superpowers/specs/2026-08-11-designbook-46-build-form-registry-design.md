# DESIGNBOOK-46 — Skill-extensible `build_form` via additive enum-union

**Ticket:** DESIGNBOOK-46 (GAIA feature, `gaia_feature`) · state `spec`
**Sub-works:** `work:code` (addon schema-merge) + `work:docs` (mechanism documentation)
**Design tool:** `superpowers:brainstorming` (approach A confirmed by the human, 2026-08-11)

## Problem

`sync-to`'s scene branch dispatches a Scene onto a **page build form**, and the set of build
forms is **closed**. Two facts pin the closure:

- `resolve-filter.md:111` — the scene branch reads the page bundle's **full** view-mode
  `template` and assigns it **identically** to each Scene-derived unit's `build_form`
  ("This value becomes each Scene-derived unit's `build_form`"). `template` is already an open
  `type: string` in the data-model schema, so a `views-page` page bundle already *parses* and
  *dispatches*.
- `.agents/skills/designbook/skills/sync-to/schemas.yml:155` — `build_form` validates against a
  **closed** `enum: [layout-builder, canvas]`. This is the only thing that rejects a third value.

A skill cannot widen that enum. `deepMergeExtends`
(`packages/storybook-addon-designbook/src/workflow-schema-merge.ts:148`) throws
`Schema extends conflict: property '<name>' already exists in base schema` on **any** existing
property that is not structurally recursable (an enum leaf carries neither `properties` nor
`required`). So a rule's `extends: ConfigNameUnit.properties.build_form.enum: [views-page]` — which
leando (BIBB-172/193) actually authored — fails result validation, and the workflow cannot
`workflow done`. No existing merge verb widens an enum: `extends` throws, `constrains` **intersects**
(narrows), `provides` sets defaults.

The leando line is currently unblocked by a **fork**: `views-page` was hand-added to the addon's
`schemas.yml` enum and mirrored into the plugin cache. This ticket removes that fork — a
project-specific build form must not require an edit inside the addon or its plugin cache.

## Decision

**Approach A — additive enum-union in `extends:`.** Keep `build_form` a validated closed set and
make that set widenable by any loaded skill. Rejected alternatives:

- **B — explicit `build_forms:` registry** (value + template-match + blueprint in one new verb):
  more self-documenting but introduces a whole registry subsystem (loader wiring, new tests) for
  what is three known build forms. YAGNI.
- **C — drop the enum to `type: string`** (no code change): removes the guardrail rather than
  making it extensible. `build_form` is a dispatch discriminator; an unknown value would pass
  validation and later match no blueprint (`transform.md` precedence 4 → "author from `prepared`
  alone"), silently producing wrong config. It also moots standing AC-7 and re-scopes the ticket to
  `work:docs`-only (a qualification-level change). Rejected.

Something in the addon must change either way (zero-change is impossible — the merge throws). A
buys a validated, explicitly-registered closed set for ~10 lines of TypeScript; C saves the code by
deleting the validation. A is the intent of the ticket ("make registration possible", not "remove
enforcement").

## Change 1 — `work:code`: narrow enum-union in `deepMergeExtends`

In `deepMergeExtends` (`workflow-schema-merge.ts`), in the branch where a property already exists in
`target.properties`, add one case **before** the existing structural-recurse / throw logic:

> When the existing property and the incoming property **both** carry an `enum` array (and are not
> otherwise structural), **union** their members — base order preserved, new members appended,
> deduplicated — instead of throwing.

Every other collision is unchanged:

- structural schemas (either side has `properties`, or incoming has `required`) still recurse;
- a non-enum leaf duplicate (e.g. `{type:'string'}` vs `{type:'number'}`) still throws
  `already exists`.

Sketch (final form authored in coding):

```ts
if (propName in target.properties) {
  const existing = target.properties[propName];
  const incoming = propSchema as Record<string, unknown> | null;

  // NEW: additive enum-union — a loaded skill widens a closed enum leaf.
  if (
    existing && typeof existing === 'object' &&
    incoming && typeof incoming === 'object' &&
    Array.isArray((existing as JsonSchema).enum) &&
    Array.isArray((incoming as JsonSchema).enum)
  ) {
    const base = (existing as JsonSchema).enum as unknown[];
    const add = (incoming as JsonSchema).enum as unknown[];
    (existing as JsonSchema).enum = [...base, ...add.filter((v) => !base.includes(v))];
    continue;
  }

  // existing structural-recurse guard …
  // existing throw …
}
```

Base-first order means the two shipped values stay first (`[layout-builder, canvas, views-page]`),
so a shipped build form is picked identically to today (AC-4).

## Change 2 — `work:docs`: generalize dispatch prose (no logic change)

Because `template→build_form` is already identity and open, **no dispatch logic changes**. Two
prose edits keep the documented surface honest:

- `sync-to/tasks/resolve-filter.md` (the "Build form (declarative, not guessed)" block and the
  "delegated to the `layout-builder`/`canvas` blueprints" line): reframe the closed
  `layout-builder ⇒ … ; canvas ⇒ …` two-way branch as — *`build_form` is the page bundle's full
  view-mode `template` value; the two shipped forms are the built-in registrations; a project skill
  registers a third by widening `ConfigNameUnit.build_form` (via `extends:` enum-union) and shipping
  the expanding blueprint, selected by its `trigger.config_name` glob.* Keep Layout-Builder / Canvas
  as the shipped examples and keep the per-form unit lists.
- `sync-to/schemas.yml` `build_form.description`: note the enum is skill-extensible, not a fixed pair.

`transform.md:89` already picks the guiding blueprint by `trigger.config_name` glob, so a
registering skill's blueprint is followed with no change (AC-3).

## Change 3 — `work:docs`: document the mechanism where authors look (AC-6)

Author via `designbook-skill-creator` (the changed artifacts are skill files):

- `.agents/skills/designbook-skill-creator/rules/rule-files.md` — the
  `extends:`/`provides:`/`constrains:` operations table: `extends:` gains "…and **unions enum
  members** on an existing enum-leaf property".
- `.agents/skills/designbook/resources/schema-composition.md` — the full merge-model description of
  the enum-union rule (when it fires, base-first/dedup ordering, that non-enum leaves still error).
- `.agents/skills/designbook/resources/workflow-execution.md` and the `sync-to` `SKILL.md` — a
  cross-reference showing how a project skill registers a build form (widen the enum + ship the
  blueprint).

## Registration lives entirely in the external skill

The extension skill (e.g. `designbook-leando`) ships:

- a rule/blueprint whose frontmatter widens the enum:
  ```yaml
  extends:
    ConfigNameUnit:
      properties:
        build_form: { enum: [views-page] }
  ```
- a blueprint that expands the `views-page` units, selected by its own `trigger.config_name` glob.

No file inside the designbook addon or its plugin cache is edited by the extension (AC-1). AC-5's
addon `schemas.yml` already carries only `[layout-builder, canvas]` in this `next`-based worktree —
satisfied once the mechanism exists; the dev-repo/plugin-cache revert happens in the consuming repo.

## Testing

- **Unit (`work:code`, AC-7)** — new cases in
  `packages/storybook-addon-designbook/src/validators/__tests__/workflow-schema-merge.test.ts`:
  1. `deepMergeExtends` unions two enum-leaf sources (base-first, deduped);
  2. still throws `already exists` on a non-enum leaf duplicate (regression guard);
  3. `computeMergedSchema` end-to-end — a rule widening `ConfigNameUnit.build_form` yields
     `[layout-builder, canvas, views-page]`.
- **Suite** — `pnpm check` (typecheck → lint → test) green from the repo root (addon/TS change).
- **End-to-end (`work:code`)** — exercised through the matching `debo-test` tester: a
  `sync`/`resolve-filter` case whose fixture **registers a third build form** and drives it through
  `resolve-filter → transform → sync`. If no fixture registers a third build form yet, author it
  first. Run from **inside this git worktree** (isolated `workspaces/`).
- **Docs (`work:docs`, AC-8)** — doc-structural checks: grep / `git diff` confirming the operations
  table, `schema-composition.md`, `workflow-execution.md`, and `sync-to` docs carry the mechanism;
  skill-frontmatter/config-load validation via `designbook-skill-creator`.

**No runtime browser surface** — `scenario_required = false`. The acceptance surface is
workflow-result validation, schema-merge behavior, and dispatch prose; there is no login-gated DOM
route to walk.

## Acceptance-criteria coverage

| AC | How it is met |
|----|----------------|
| 1 — external skill registers, no addon/plugin-cache edit | enum widened from the external skill's rule/blueprint frontmatter |
| 2 — widened `build_form` passes `workflow done` validation | enum-union merges `views-page` into the validated enum |
| 3 — dispatch selects it + expands via registering blueprint | identity `template→build_form` + `transform.md` `trigger.config_name` blueprint selection |
| 4 — shipped `layout-builder`/`canvas` unchanged | base-first union keeps them first; non-enum collisions still throw |
| 5 — `views-page` no longer needed in addon `schemas.yml` | mechanism makes the value registerable externally; addon schema stays `[layout-builder, canvas]` |
| 6 — documented where authors look | rule-files.md table + schema-composition.md + workflow-execution.md + sync-to docs |
| 7 (standing, code) — validated, additive schema-merge coverage | new `workflow-schema-merge.test.ts` cases + `pnpm check` + `debo-test` |
| 8 (standing, docs) — doc-structurally validated, authored via skill-creator | grep/diff/config-load checks; `designbook-skill-creator` |

## Risks

- **Overloading `extends:` semantics.** The union fires only when **both** sides carry an `enum`
  array, a narrow, well-defined case; all current tests use non-enum leaves and stay green. Chosen
  over a new `widens:` verb so leando's existing frontmatter needs no change and the vocabulary stays
  at three verbs.
- **Silent over-widening.** Any loaded skill can now add enum members to any enum leaf, not just
  `build_form`. Acceptable: enum-union is strictly additive and a skill must be loaded to contribute;
  it cannot remove or override members. Documented in `schema-composition.md`.
