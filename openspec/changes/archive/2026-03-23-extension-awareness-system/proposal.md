## Why

Designbook workflows propose entities and field types without knowing which CMS modules are active in the project. A project using Canvas should never see `block_content` suggestions; one using Paragraphs needs `entity_reference_revisions` fields; one using the Address module needs the `address` field type. There is no mechanism to capture this knowledge or use it during intake.

## What Changes

- **Extensions config format upgraded**: `extensions` in `designbook.config.yml` changes from a simple string array to an object array with `id`, optional `url`, and optional `skill` (backward-compatible)
- **`when.extensions` condition key**: Rule files can declare `when: extensions: <id>` to activate only when that extension is present — same pattern as `when.backend`
- **Extension skill auto-loading**: Extensions with a `skill` field get that skill injected as a `config_instruction` into matching workflow stages
- **Data model intake becomes extension-aware**: Reads `extensions` from config, fetches URLs if present, integrates knowledge into entity/field suggestions
- **Drupal data model rule updated**: Drops static layout-system comments; extension-specific rules load via `when.extensions`

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `extensions-config`: Format changes from `extensions: [layout_builder]` (string array) to `extensions: [{id: layout_builder, url: ..., skill: ...}]`. Config loader exposes `DESIGNBOOK_EXTENSIONS` (ids) and `DESIGNBOOK_EXTENSION_SKILLS` (skill ids). Adds `when.extensions` as a new condition key in the rule scanner. Backward-compatible: plain strings still accepted.
- `designbook-data-model-drupal`: `drupal-data-model.md` rule drops static layout-system conditionals. Extension-specific rules use `when.extensions`. Canvas and Layout Builder documented as rule files, not inline conditionals.
- `scene-handlers`: New `map-entity` template rule files for `layout-builder` and `canvas` — define the JSONata pattern for rendering entities using these layout systems.
- `sample-data-field-templates`: New sample data rules for `layout-builder` and `canvas` template contexts — define what field structure records should have when these templates are active.

## Impact

- `designbook.config.yml` schema documentation
- `packages/storybook-addon-designbook` config loader (extensions parsing, `DESIGNBOOK_EXTENSION_SKILLS`)
- CLI rule scanner (`when.extensions` condition key)
- `.agents/skills/designbook-data-model/tasks/intake.md`
- `.agents/skills/designbook-data-model-drupal/rules/drupal-data-model.md`
- `.agents/skills/designbook-scenes-drupal/rules/layout-builder.md` (new)
- `.agents/skills/designbook-scenes-drupal/rules/canvas.md` (new)
- `.agents/skills/designbook-sample-data-drupal/rules/sample-layout-builder.md` (new)
- `.agents/skills/designbook-sample-data-drupal/rules/sample-canvas.md` (new)
- `.agents/skills/designbook-workflow/resources/architecture.md` (document `when.extensions`)
