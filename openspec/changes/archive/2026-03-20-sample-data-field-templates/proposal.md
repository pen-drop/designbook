## Why

Sample data generation produces flat strings for all field types, even when CMS field types require structured objects (e.g., `{ value: "...", format: "basic_html" }` for formatted text, `{ uri: "...", title: "..." }` for links). There is no mechanism to define or configure the correct output structure per field type, leading to invalid sample data that doesn't match what the CMS actually delivers.

## What Changes

- New `sample_data.field_types` config key in `designbook.config.yml` — maps field type names to sample template names
- New `sample_template` key on fields in `data-model.yml` — explicit per-field template override with `template` + `settings` sub-keys
- `settings.hint` provides content guidance; other settings keys are template-specific
- New rule in `designbook-data-model` — during model creation, reads `sample_data.field_types` from config and automatically sets `sample_template` on matching fields
- `create-sample-data` task updated — evaluates `sample_template` per field, loads matching rule, generates structured output
- New `designbook-sample-data-drupal` skill — rules for common Drupal field templates (`formatted-text`, `link`, `image`)
- `data-model.schema.yml` in the addon — `sample_template` added to field definition

## Capabilities

### New Capabilities

- `sample-data-field-templates`: Fields in `data-model.yml` can declare a `sample_template` with `template` and `settings`. The `create-sample-data` stage loads rules matching `when: template: <name>` to determine the output structure. A `field_type` condition on rules provides fallback matching without explicit `sample_template`.

### Modified Capabilities

- `designbook-configuration`: New `sample_data.field_types` map — keys are field type names, values are template names. Used during data model creation to auto-assign `sample_template` to fields.
- `data-model-workflow`: During `debo-data-model:dialog` and `create-data-model` stages, the AI reads `sample_data.field_types` from config and sets `sample_template` on fields whose type has a mapping.

## Impact

- `.agents/skills/designbook-sample-data/` — update `create-sample-data.md` task, update `SKILL.md`
- `.agents/skills/designbook-sample-data/rules/` — new rule for auto-applying templates from config
- `.agents/skills/designbook-sample-data-drupal/` — new skill with `SKILL.md` and rules for Drupal field templates
- `.agents/skills/designbook-data-model/rules/` — new rule for setting `sample_template` during model creation
- `.agents/skills/designbook-configuration/SKILL.md` — document `sample_data.field_types` config key
- `packages/storybook-addon-designbook/src/validators/schemas/data-model.schema.yml` — add `sample_template` to field definition
- No runtime code changes — sample data is AI-layer only
