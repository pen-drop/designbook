## Why

The `view-mode-template` spec replaced `composition: unstructured` with per-view-mode `template` keys, and the schema was updated accordingly — but the AI skills and rules were never updated. Skills still guide the AI to write `composition: unstructured` and reference `extensions` config, causing a drift between spec/schema and AI behavior.

## What Changes

- Remove all references to `composition: structured | unstructured` from skills and rules
- Remove all references to `extensions` config from skills and rules
- Replace guidance with the current model: `view_modes.<mode>.template: <name>` on bundles
- Update `ensure-sample-data` task to use view_mode template instead of composition
- Update `drupal-data-model` rule: guide AI to set `view_modes.full.template: layout-builder` (or `canvas`) for landing pages instead of `composition: unstructured`
- Archive the dangling `view-mode-templates` change (proposal-only, never got tasks)

## Capabilities

### New Capabilities

_(none — this is a cleanup, no new specs needed)_

### Modified Capabilities

_(no spec-level requirement changes — specs are already correct. This change brings skills/rules into alignment with existing specs.)_

## Impact

- `.agents/skills/designbook-data-model/SKILL.md` — remove `composition` from format example
- `.agents/skills/designbook-data-model/rules/drupal-field-naming.md` — replace unstructured table with `view_modes` guidance
- `.agents/skills/designbook-data-model-drupal/rules/drupal-data-model.md` — replace `composition`/`extensions` with `view_modes.full.template`
- `.agents/skills/designbook-scenes/resources/jsonata-reference.md` — remove `unstructured bundles` section
- `.agents/skills/designbook-scenes/resources/view-entity.md` — remove `composition: unstructured` example
- `.agents/skills/designbook-sample-data/tasks/ensure-sample-data.md` — replace `composition: unstructured` condition with view_mode template check
- Archive `openspec/changes/view-mode-templates` (proposal-only orphan)
