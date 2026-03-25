## Why

The `designbook-sample-data` skill treats `content:` and `config:` entities as fundamentally different things — the task has special-cased view generation logic, `format.md` documents entity references incorrectly for content entities, and `_meta` appears in generated files despite not being part of any schema. In reality `content:` and `config:` are just top-level buckets; the generation logic is identical underneath both, and all differences reduce to field types and `sample_template` rules.

## What Changes

- **`format.md` rewrite** — document `content:` / `config:` as buckets with identical logic underneath; fix entity reference documentation (content fields use string IDs, object form is template-only); remove all `_meta` references
- **`create-sample-data.md` simplification** — remove `view_configs` param and special-cased view loop; replace with a single uniform loop over all bundles from data-model.yml (content pass first, config pass second)
- **`intake.md` simplification** — drive entity list from `data-model.yml` directly instead of inferring via scenes files
- **New `views` sample_template rule** — `rows[]` generation becomes a field template rule (like `canvas`), not task-level logic. Config entities with `rows` declare `sample_template: template: views`

## Capabilities

### New Capabilities

- `sample-data-config-entities`: Unified treatment of `config:` entities in data.yml generation — same loop as content, two-pass ordering (content first so config templates can reference record indices), extensible via field template rules

### Modified Capabilities

- `sample-data-field-templates`: Add `views` as a built-in template — generates `rows[]` with `{type: entity, entity_type, bundle, view_mode, record: N}` entries; complements existing `canvas` and `layout-builder` templates

## Impact

- `.agents/skills/designbook-sample-data/` — all files touched (SKILL.md, format.md, tasks/intake.md, tasks/create-sample-data.md)
- Promptfoo fixtures and workspace `data.yml` files — already fixed (no `_meta`, wrapped under `content:`)
- No runtime code changes — skill-only
