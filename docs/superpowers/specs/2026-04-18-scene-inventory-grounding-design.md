# Scene Inventory Grounding & Self-describing Result Schemas

Date: 2026-04-18
Status: Approved (brainstorming)

## Motivation

A post-workflow audit of `design-shell` surfaced two persistent failure modes:

1. **Phantom component references.** The scene stage emitted `$DESIGNBOOK_COMPONENT_NAMESPACE:logo`, `:button`, `:link` — ids that were never produced by the component stage. Storybook then failed to render the scene (`Cannot find template`), requiring manual cleanup mid-run.
2. **Opaque submission contract.** The `workflow done --data '<json>'` mechanism for task results is only documented in prose. During the run, the AI repeatedly wrote files directly, triggering the "file result(s) were written directly instead of via `workflow done --data`" error, because the result schema did not advertise which submission channel applied.

These issues will affect every future `design-shell`, `design-screen`, and `design-component` run unless the generation layer is grounded in verifiable truth (Storybook's index) and task schemas become self-describing.

## Scope

Three interlocking workstreams in `packages/storybook-addon-designbook` and the skills layer:

1. **Self-describing result schemas.** Two orthogonal fields on each result property: `submission: data | direct` (who produces the content) and `flush: deferred | immediate` (when it lands on disk). The existing `flush: immediately` convention is narrowed to the enum value `flush: immediate` — no compat shim for the old value name. The `workflow instructions` CLI emits a structured per-task "Submit results" section with the expected `--data` JSON shape.
2. **Stories-index-grounded scene generation.** A new `components_index` resolver fetches Storybook's `/index.json` and derives the set of available `<namespace>:<component-name>` ids via a regex pattern contributed by the active integration. The `create-scene` task receives this inventory as a `components` param; the scene result schema enum-constrains every `component:` reference to that set. Safety-net validator re-checks on `workflow done`.
3. **Reference-driven intake decomposition.** The `intake--design-shell` task gains an explicit, deterministic decomposition rule: structural components come from `extract.json.landmarks`; atomic components come from parsing `landmarks.*.rows[].content` prose. Thin convention blueprints (`button.md`, `logo.md`, `link.md`, `icon.md`) encode only the variant mechanism — no site-specific content.

### Out of Scope

- Blueprint over-loading (filter blueprint load by `name:` match). Acknowledged but not fixed here; the AI continues to filter 8-blueprint context itself.
- Sharpening `extract-reference` to emit a structured `atoms: [...]` list instead of prose `content`. Known-issue; planned as a follow-up change.
- Metadata beyond component ids in the inventory (slots, props, variants). The enum-on-id constraint fixes the phantom-reference problem; deeper metadata is deferred.

### Already Applied in the Session Preceding This Spec

Not part of this spec's implementation but context-relevant:

- SdcStoryNode schema gained a top-level `type: { enum: [element, component, image] }` + `discriminator: { propertyName: type }` to surface valid discriminator values at a glance.
- `designbook-css-tailwind/rules/component-source.md` rewritten to document wildcard `@source` as the default, with explicit per-component `@source` only as an escape hatch.
- `designbook/design/rules/playwright-validate.md` extended with a preflight note: `_debo storybook start --force` when new components were created during the same run, because `toTwingNamespaces()` caches at Storybook startup.

## Workstream 1: Self-describing Result Schemas

### Schema Extension

Each `result:` property may declare two independent fields — `submission:` (who writes the content) and `flush:` (when it lands on disk):

```yaml
result:
  type: object
  required: [component-yml, component-twig]
  properties:
    component-yml:
      path: components/{{name}}/{{name}}.component.yml
      $ref: ../schemas.yml#/SdcComponentYaml
      # submission: data  flush: deferred  (implicit defaults)
    schema-patch:
      path: ...
      flush: immediate          # AI submits; CLI writes straight away
    screenshot:
      path: designbook/screenshots/{{name}}.png
      submission: direct        # task code writes; flush is irrelevant
```

### `submission:` — who produces the content

| Value | Semantics |
|---|---|
| `data` (default) | AI submits the value via `workflow done --data '{"<key>": <value>}'`. The CLI serializes per the property's extension (`.yml` → YAML, `.twig`/`.css` → raw string) and writes to `path:`. |
| `direct` | Task code writes the file itself (Playwright screenshot, CLI invocation, shell output, …). The CLI runs post-write validation against `$ref` / `validators:` only. `flush:` is ignored — the file already exists. |

### `flush:` — when the file lands on disk

Only meaningful when `submission: data`. Ignored for `submission: direct`.

| Value | Semantics | Replaces |
|---|---|---|
| `deferred` (default) | CLI writes to `path:` at **stage flush**. | Absent `flush:` field. |
| `immediate` | CLI writes to `path:` as soon as **`workflow done` completes**, before the stage flushes. | `flush: immediately`. |

Data-only results (no `path:`) are always submitted via `--data` and ignore both fields.

### CLI: `workflow instructions` Enhancement

`workflow instructions <task-id>` gains a new "Submit results" section when at least one result has `submission: data` (any `flush:` value):

```
## Submit results

Return every `submission: data` result in a single call:

    workflow done --task <id> --data '<json>'

The JSON must match:

    {
      "component-yml":   <SdcComponentYaml>,       // → components/<name>/<name>.component.yml
      "component-twig":  <SdcTemplate>,            // → components/<name>/<name>.twig
      "component-story": <SdcStoryFile>            // → components/<name>/<name>.default.story.yml (flush: immediate)
    }

Direct-submission results (written by task code, not submitted):

    screenshot                                     → designbook/screenshots/<name>.png
```

Schema type placeholders are derived from each property's `$ref:` (last path segment) or the inline `type:` when no `$ref` exists. No schema body is inlined in the hint — the CLI links to the `schemas.yml` entry by name. Properties with `flush: immediate` are annotated inline so task authors can spot them without cross-referencing the task file.

### `workflow done` Enforcement

When a task has at least one `submission: data` property and `workflow done` is called without `--data`, the CLI fails with:

```
Error: task <id> has data-submission results. Call `workflow done` with `--data` containing:

<the hint shape above>
```

### Legacy `flush: immediately` Rejection

The schema parser accepts `flush:` only with the new enum values (`deferred` | `immediate`). The legacy value `immediately` is rejected:

```
Error: `flush: immediately` is no longer supported. Replace with `flush: immediate`.
```

No silent migration, no fallback read. All existing `flush: immediately` occurrences in `.agents/skills/` are rewritten to `flush: immediate` as part of the implementation. Tasks that previously relied on the absence of `flush:` continue to work — the default is `deferred`.

### Engine Impact

- `packages/storybook-addon-designbook/src/cli/workflow-resolve.ts` — `expandResultDeclarations` accepts `submission: data|direct` and `flush: deferred|immediate`; rejects `flush: immediately`.
- `packages/storybook-addon-designbook/src/cli/workflow-instructions.ts` (or equivalent renderer) — new "Submit results" section.
- `packages/storybook-addon-designbook/src/cli/workflow-done.ts` — enforcement check (`submission: data` requires `--data`) and structured error.
- Result-staging logic — routes by `(submission, flush)` pair. `direct` skips the write phase entirely.

## Workstream 2: Stories-Index-Grounded Scene Generation (B′-pattern)

### Resolver Design

A new resolver `components_index` under `packages/storybook-addon-designbook/src/resolvers/`:

1. Fetch `<storybook_url>/index.json` (shares HTTP utility with `story-match.ts`).
2. For each entry, match `importPath` against the active integration's pattern (see below).
3. On match, derive `<namespace>:<componentName>` where:
   - `<namespace>` comes from `config.component.namespace`
   - `<componentName>` is the configured capture group from the regex
4. Dedupe (multiple stories per component collapse to one inventory entry).
5. Emit `Component[]`:

```yaml
- id: test_integration_drupal:navigation
  story_id: drupal-web-shell-navigation--default
  import_path: ./components/navigation/navigation.component.yml
```

Slot and prop metadata are **out of scope** — the `id` enum alone prevents phantom references, and deeper metadata belongs to a later change.

### Integration Pattern Contribution

The addon ships a default registry keyed by `frameworks.component`:

```ts
// packages/storybook-addon-designbook/src/config/story-patterns.ts
export const DEFAULT_STORY_PATTERNS = {
  sdc: {
    import_path_pattern: /^\.\/components\/([^/]+)\/\1\.component\.yml$/,
    component_name_group: 1,
  },
  // stitch: {...}  future
};
```

Resolver lookup order:

1. `config.component.story_filter` (user override), if present → use verbatim.
2. Otherwise, `DEFAULT_STORY_PATTERNS[config.frameworks.component]` → use built-in.
3. If neither → `workflow create` blocks with: `No story filter for frameworks.component=<value>. Set component.story_filter explicitly or use a known framework.`

Fixture configs are not modified — the default registry covers SDC. Integrations that diverge from the standard SDC layout document their override in the user config.

### Task and Schema Wiring

`designbook/design/tasks/create-scene.md` gains a `components` param:

```yaml
params:
  properties:
    components:
      type: array
      resolve: components_index
      items:
        $ref: ../../scenes/schemas.yml#/Component
```

The `SceneNode.component` field in `scenes/schemas.yml` stays declared as `type: string` on disk. At `workflow create` time, the engine clones the compiled task schema and injects an `enum:` (from the resolver output) onto every `component:` leaf in the scene tree. The enum lives only in the per-stage compiled schema used for `workflow done` validation — never written back to `schemas.yml`. The enum is fixed for the duration of the stage.

### Safety-Net Validator

The existing semantic `scene` validator (called on `workflow done` for the `scene-file` result) re-runs the resolver and compares every `component:` string to the inventory. This catches edge cases where the schema enum slips (e.g. dynamic schema injection has a gap). Duplicate of the schema check by design — shallow-cost, high-value.

### Stale Index Handling

The resolver always fetches a fresh `index.json` per `workflow create`. Storybook startup caches the Twig namespace map (`toTwingNamespaces`), so new components appearing mid-run require `_debo storybook start --force` — already enforced by the preflight rule in `playwright-validate.md`. The index-based resolver benefits from the same preflight: after a forced restart, the new components appear in `/index.json`.

### Engine Impact

- `packages/storybook-addon-designbook/src/resolvers/components_index.ts` — new resolver.
- `packages/storybook-addon-designbook/src/config/story-patterns.ts` — default pattern registry.
- `packages/storybook-addon-designbook/src/config/schema.ts` — accept `component.story_filter.{import_path_pattern,component_name_group}` (optional).
- `packages/storybook-addon-designbook/src/validators/scene.ts` — resolver-based id check.
- `.agents/skills/designbook/design/tasks/create-scene.md` — `components` param declaration.
- `.agents/skills/designbook/scenes/schemas.yml` — `SceneNode.component` accepts dynamic enum injection.

## Workstream 3: Reference-driven Intake Decomposition

### Thin Convention Blueprints

Four new files in `.agents/skills/designbook-drupal/components/blueprints/`, each ~10-15 lines:

- `button.md` — `variant` enum `[primary, outline, ghost, default]`, `size` (optional), `disabled`, optional `icon` slot.
- `logo.md` — `variant` enum `[full, mark-only, inverse]`, `href` (default `/`), `media` slot.
- `link.md` — `variant` enum `[default, subtle, external]`, optional `icon` slot.
- `icon.md` — `name` string, `size` enum `[sm, md, lg]`, no content slot.

All four: `trigger.domain: components` (universal — relevant in shell, screen, and standalone component workflows) and `type: component`, `name: <atom>`, `priority: 10` to match existing blueprint-frontmatter style. No site-specific content — no default labels, URLs, colors, or imagery.

### Structural Blueprints Unchanged

`page.md`, `header.md`, `footer.md` continue with `trigger.domain: components.shell`. `navigation.md`, `container.md`, `grid.md`, `section.md`, `form.md` continue with `trigger.domain: components`. No edits to these files within this spec.

### Intake Task Rewrite

`designbook/design/tasks/intake--design-shell.md` step 2 becomes deterministic. Task body (the WHAT being produced — the `component[]` list):

> ### Result: component
>
> Enumerate every component that will be created. The list is derived from two sources with no ad-hoc decisions:
>
> 1. **Structural landmarks.** For each top-level entry in `extract.json.landmarks` (header, footer, main, …), emit one component. Nested rows inside a landmark MAY be composed as `section` components when the reference shows distinct backgrounds or borders between rows.
> 2. **Atoms from prose.** Parse `extract.json.landmarks.*.rows[].content`. For each distinct interactive element or branded mark referenced:
>    - Logo / wordmark → `logo` (see `logo.md`)
>    - CTA button / labelled action → `button` (see `button.md`)
>    - Plain text anchor / inline link → `link` (see `link.md`)
>    - Non-text symbol (social icons, search glyph, hamburger) → `icon` (see `icon.md`)
>    - Anything without a matching convention blueprint → emit a design-specific component with a role-based name (e.g. `lang-switcher`, `search-trigger`, `auth-cta`).
>
> Reuse an existing component when its slots/variants already cover the new need — do not create near-duplicates.

### Coverage Check (Soft)

A non-blocking validator `decomposition-coverage` is defined but implemented as **warning-only**. It counts atoms referenced in the extract prose and compares against `component[]` entries; any gap is logged for audit. Hard enforcement is left to the Stories-Index-Grounding workstream (Workstream 2) — the enum constraint is mechanical and sufficient.

### Engine and Skill Impact

- `.agents/skills/designbook-drupal/components/blueprints/button.md` — new.
- `.agents/skills/designbook-drupal/components/blueprints/logo.md` — new.
- `.agents/skills/designbook-drupal/components/blueprints/link.md` — new.
- `.agents/skills/designbook-drupal/components/blueprints/icon.md` — new.
- `.agents/skills/designbook/design/tasks/intake--design-shell.md` — step 2 rewrite.
- `.agents/skills/designbook/design/rules/decomposition-coverage.md` — optional, soft warning validator.

## Error Handling & Edge Cases

### Phantom Component Reference (Primary Protection)

`workflow done` on the scene task → schema validator compares every `component:` field against the enum from `components_index`. Mismatch fails with:

```
Unknown component "test_integration_drupal:logo".
Available: test_integration_drupal:page, test_integration_drupal:header, test_integration_drupal:footer, test_integration_drupal:navigation
```

No Storybook render attempted — the failure is detected before the CLI writes the scene file.

### Legacy `flush: immediately` Post-Migration

```
Error: `flush: immediately` is no longer supported. Replace with `flush: immediate`.
```

No silent acceptance.

### `workflow done` Without `--data` for Data-Submission Tasks

Existing error is restructured to include the CLI instructions hint verbatim so the retry call can be copy-pasted.

### Storybook Not Running

Resolver shares fetch code with `story_url` — same error, same remediation (`_debo storybook start`).

### Empty Index (Component Stage Skipped or Empty)

Resolver emits `components: []`; the scene schema enum has no valid values. First `component:` reference fails with:

```
No components indexed. Ensure the component stage completed and flushed before the scene stage runs.
```

### Vague Extract Prose

`landmarks.*.rows[].content` is prose and can be underspecified. The intake task derives fewer atoms; the soft coverage validator logs a warning. The Stories-Index enum in Workstream 2 still prevents phantom rendering — the worst case is a scene with fewer atomic components than visually needed, not a broken render. Sharpening the extract is a follow-up change.

### Missing Default Pattern and No Override

```
Error: No story filter for frameworks.component=<value>.
Set component.story_filter in designbook.config.yml or use a supported framework.
```

## Testing

### Unit Tests (`packages/storybook-addon-designbook`, vitest)

- `resolvers/components_index.test.ts` — Index JSON with the SDC default pattern; user-override pattern takes precedence; unknown framework fails with the expected message; dedupe across multiple stories of one component; empty index.
- `cli/workflow-resolve.test.ts` — `submission:` and `flush:` accepted with each enum value; both default correctly (`data` / `deferred`); `flush: immediately` fails with the rename error.
- `cli/workflow-instructions.test.ts` — Hint section emitted only when data-submission results exist; schema names come from `$ref` last segment; direct-submission results appear in a separate block; `flush: immediate` properties are annotated inline.
- `cli/workflow-done.test.ts` — Enforcement triggers on any `submission: data` result; error includes the hint text.
- `validators/scene.test.ts` — Phantom id fails; known id passes; runs independently of schema enum as safety net.

### Integration Test (Fixtures)

`designbook-test drupal-web design-shell` re-run. Acceptance criteria:

- Generated `design-system.scenes.yml` references only `test_integration_drupal:page`, `test_integration_drupal:header`, `test_integration_drupal:footer`, `test_integration_drupal:navigation` **plus** atoms produced by the new intake rules (e.g. `test_integration_drupal:logo`, `test_integration_drupal:button`, `test_integration_drupal:link`) — never phantom ids.
- Atom components (`logo`, `button`, `link`, `icon`) are created with the variant props declared in their new blueprints.
- `workflow instructions` CLI emits the "Submit results" section for every task with file results.
- `workflow done` without `--data` produces the structured error with hint.
- Scene validator accepts the generated scene without phantom warnings.

### Migration Guard (CI)

Repo-wide grep check fails the build if `flush:\s*immediately` appears under `.agents/skills/` or `packages/storybook-addon-designbook/src/` after the migration lands.

## Rollout

Single-change delivery — no feature flag, no phased rollout. The `flush: immediately` → `flush: immediate` rename and the `submission:` addition land atomically with the schema-parser change. The Stories-Index resolver lands together with the `create-scene` task-param addition so scenes always have an inventory. Thin atom blueprints land with the intake rewrite.

Rollback: a single revert restores the prior behaviour. No on-disk artifacts are migrated — test workspaces are regenerated from fixtures, so any state lives ephemerally in workspace directories.
