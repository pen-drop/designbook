# Scene Lifecycle Cleanup + Token-Shape Contract

**Status:** Design — awaiting user approval before planning.
**Date:** 2026-04-19.
**Scope:** `.agents/skills/designbook/` (core skill), `.agents/skills/designbook-css-tailwind/`, fixtures under `fixtures/drupal-petshop/`.

## Problem statement

The `/designbook-test drupal-petshop design-screen` research run exposed four defects, all caused by missing or inconsistent contracts at workflow read-boundaries:

1. **`design-screen` workflow blocks on a dead param.** `design-screen.md` declares `scene_id` as a required param with no resolver, so the workflow cannot start without a hand-edited `tasks.yml`. The `story_id` resolver (addon-registered) already covers the same identifier need.
2. **`create-scene.md` uses the deprecated `output_path` pattern.** Other single-output tasks (e.g. `create-section.md`) derive the result path via the `scene_path` resolver and declare iteration via `each:`. `create-scene.md` hard-codes five required params (`output_path`, `scene_id`, `section_id`, `section_title`, `components_dir`) that nothing upstream resolves.
3. **`css-generate` intake accepts any shape of `design-tokens.yml` silently.** `designbook/tokens/schemas.yml` already enforces a three-tier `primitive` / `semantic` / `component` model, but `intake--css-generate.md` declares `design_tokens: { type: object }` without a `$ref`. Flat token fixtures produce empty CSS output instead of failing at the boundary.
4. **`Section` schema duplicates `SceneFile`.** `sections/schemas.yml` defines `Section` with fields `{ id, title, description, status, order, group }` — a strict subset of `SceneFile`. "Section" is a domain-semantic concept, not a technical artefact; the only on-disk artefact is a scene file.

## Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | Remove the `scene_id` param from `design-screen.md` workflow | Redundant with the addon-resolved `story_id`; removal unblocks the workflow without hand-editing |
| D2 | `create-scene.md` adopts the `create-section.md` pattern: `each: scene:` + `scene_path` resolver, result path templated via `{{ scene_path }}`, no `output_path` param | Matches the established single-output task pattern; removes the deprecated raw-output-path contract |
| D3 | `create-scene.md` and `create-scene-file.md` (formerly `create-section.md`) move into the `scenes/` concern | Both tasks write `SceneFile` artefacts; they belong next to the schema they reference |
| D4 | Rename `create-section.md` → `create-scene-file.md`; delete `sections/schemas.yml` (Section schema) | Section is content-semantic, not technical. Schema name `SceneFile` drives task names: `create-scene-file` (container) pairs with `create-scene` (entry). All `$ref: …/sections/schemas.yml#/Section` usages swap to `SceneFile` |
| D5 | `intake--css-generate.md` `design_tokens` param gains `$ref: ../../tokens/schemas.yml#/DesignTokens` | Shape mismatches fail loudly at intake instead of producing empty CSS |
| D6 | Rewrite `fixtures/drupal-petshop/designbook/design-system/design-tokens.yml` to the three-tier shape | Disposable artefact per project rules; must match the core schema |

## Architecture after changes

### Concern layout

```
scenes/
  schemas.yml           # SceneFile, SceneDef, SceneNode, …  (unchanged)
  tasks/
    create-scene-file.md  # init SceneFile skeleton (scenes: [])
    create-scene.md       # add one SceneDef to an existing SceneFile

sections/               # roadmap concern — no schema, no scene tasks
  workflows/
    sections.md
    shape-section.md
  tasks/
    intake--sections.md

design/
  workflows/            # design-screen, design-shell, design-component, design-verify
  tasks/                # intake--design-*, map-entity, capture/verify/polish
  rules/                # shell-scene-constraints, screen-scene-constraints, …
```

### Task contracts

**`scenes/tasks/create-scene-file.md`** (relocated + renamed from `sections/tasks/create-section.md`):

- Params: unchanged in spirit — `section` (now typed as a subset of `SceneFile`), `vision`, `sections_dir`, `scene_path` (resolver chain `from: section.id`).
- Result: `scene-file` at `$DESIGNBOOK_DATA/{{ scene_path }}`, `$ref: SceneFile`.
- `each: section: { expr: "section", schema: <SceneFile subset> }` — unchanged binding name preserved for workflow compatibility.

**`scenes/tasks/create-scene.md`** (relocated + reshaped):

- Params: `story_id` (addon-resolved), `scene_path` (resolver chain — exact source decided in the implementation plan), `components_dir`, `components` (resolve: `components_index`), optional `reference`, `data_model`, `design_scenes`.
- `required:` reduced to what callers genuinely provide; `output_path`, `scene_id`, `section_id`, `section_title` disappear as required.
- `each: scene: { expr: "scenes", schema: { $ref: ../schemas.yml#/SceneDef } }`.
- Result: `scene-file` at `$DESIGNBOOK_DATA/{{ scene_path }}`, `$ref: SceneFile`. Task body documents that the write is an *append* to the existing file.
- Task body reads `section_id` / `section_title` from the existing scene file rather than requiring them as params.

**`css-generate/tasks/intake--css-generate.md`**:

- `params.design_tokens` gains `$ref: ../../tokens/schemas.yml#/DesignTokens`.

### Workflow changes

**`design-screen.md`**:

- Remove line `scene_id: { type: string }`.
- Keep existing `story_id` resolver declaration.
- Add whatever is needed to chain `story_id` → `scene_path` (either a new `section_id` resolver or an extension to `scene_path` resolver that accepts story-id format — plan-level decision).

**`design-shell.md`**:

- Remove `scene_id: { default: "design-system:shell" }`.
- Remove `section_title: { default: "Shell" }`.
- Keep `section_id: { default: "shell" }`.
- Add `scene_path: { resolve: scene_path, from: section_id }` (resolver already has the `input === 'shell'` special case).

### Fixture shape

`fixtures/drupal-petshop/designbook/design-system/design-tokens.yml` is rewritten from:

```yaml
color:
  primary: { $value: "#4F46E5", $type: color }
  …
typography:
  heading: …
```

to:

```yaml
primitive:
  color:
    primary: { $value: "#4F46E5", $type: color, description: "Indigo" }
    …
  fontFamily:
    sans: { $value: "Inter, system-ui, sans-serif", $type: fontFamily }
  fontSize:
    base: { $value: "1rem", $type: dimension }
    …
semantic:
  color:
    primary:
      $value: "{primitive.color.primary}"
      $type: color
      description: Brand primary
    …
  typography:
    heading:
      $value:
        fontFamily: "{primitive.fontFamily.sans}"
        fontSize: "{primitive.fontSize.xl}"
        fontWeight: 700
        lineHeight: 1.2
      $type: typography
    body:
      …
component: {}  # filled by blueprints that declare required_tokens
```

Every existing flat color becomes a primitive leaf and is re-surfaced as a semantic alias, so the semantic-required properties are satisfied. `component:` stays `{}` because no Drupal blueprint currently declares `required_tokens`.

## Consumers touched

Grep targets (non-exhaustive — the implementation plan enumerates them):

- Any `$ref: .*sections/schemas.yml#/Section` → swap to `SceneFile`.
- Any `trigger.steps: [create-section]` subscriber — only the one task file being renamed.
- Any workflow that references the `create-section` step by name → rename to `create-scene-file`:
  - `sections/workflows/sections.md`
  - `sections/workflows/shape-section.md`
- Any `each: section:` consumer reading data from the renamed task's result → key remains `section-scenes` (unchanged) or is renamed to `scene-file` (plan-level).

## Explicitly out of scope

- The `{{ reference_folder }}/extract.json` literal-directory bug in `extract-reference.md` (user deferred: "looks good for now").
- Shell-coupled rules and blueprints bleeding into the `design-screen` scene stage (user deferred: "not important").
- Renaming the `sections/` concern folder or moving its workflows.
- Changes to the addon resolver registry beyond what is strictly required to unblock the `scene_path` chain.

## Testing

1. Run `/designbook-test drupal-petshop design-screen` in a fresh workspace.
2. Expected: `css-generate` produces populated CSS (token shape now matches); `design-screen` completes without needing a hand-edited `tasks.yml`.
3. Run `/designbook-test drupal-petshop design-shell` (if fixture case exists) to confirm shell workflow still passes after the `scene_id`/`section_title` defaults removal.
4. Run `pnpm check` for the addon package (typecheck + lint + test) in case the resolver chain needs an addon-side change.
5. Run `debo validate` (skill validator) if available for static checks on the refactored skill files.

## Open decisions for the implementation plan

- Which resolver-chain approach to use for `design-screen` to get from `story_id` to `scene_path`:
  - **A.** Add a new `section_id` resolver (`from: story_id`), chain `scene_path: { from: section_id }`.
  - **B.** Extend the existing `scene_path` resolver to accept story-id format directly.
- Whether to keep the result key name `section-scenes` in `create-scene-file.md` or rename it to `scene-file` for consistency with the schema.
- Whether `design-shell` needs an explicit `create-scene-file` step before `create-scene` (if `design-system.scenes.yml` may not yet exist).
