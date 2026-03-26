## Why

Currently, complex bundle behaviors (layout-builder landing pages, canvas pages) are triggered by field-level `sample_template` markers, not by the bundle's semantic role. This creates an indirect, fragile coupling: rules check `sample_template.template: layout_builder` on a field instead of knowing what the bundle actually *is*. Adding `purpose` as a first-class bundle property makes the intent explicit and readable by all downstream stages (sample-data, entity-mapping).

## What Changes

- `purpose` becomes an optional string property on bundles in `data-model.yml`
- `data-model.schema.yml` gets `purpose` added to the bundle definition
- Intake prompts for purpose when creating bundles (e.g. "landing-page", "article", "section")
- `layout-builder.md` and `canvas.md` rules check bundle `purpose` to set `view_modes.full.template`
- `sample-layout-builder.md` migrated: checks bundle `purpose: landing-page` instead of field `sample_template.template: layout_builder`
- `sample-canvas.md` migrated: checks bundle `purpose: landing-page` (+ extensions: canvas) instead of field `sample_template.template: canvas`

## Capabilities

### New Capabilities

- `bundle-purpose`: Optional `purpose` string on bundles in data-model.yml. Stored explicitly, read by data-model, sample-data, and entity-mapping rules to apply purpose-conditional logic.

### Modified Capabilities

- `designbook-data-model-drupal`: Intake gains purpose prompt per bundle; layout-builder and canvas rules apply view_modes template based on purpose.
- `sample-data-field-templates`: Sample rules for layout-builder and canvas migrate from field-level `sample_template` trigger to bundle-level `purpose` trigger.

## Impact

- Modified: `data-model.schema.yml` — add optional `purpose: string` to bundle
- Modified: `designbook-data-model:intake` — prompt for purpose per bundle
- Modified: `designbook-drupal/data-model/rules/layout-builder.md` — purpose-conditional view_modes logic
- Modified: `designbook-drupal/data-model/rules/canvas.md` — purpose-conditional view_modes logic
- Modified: `designbook-drupal/sample-data/rules/sample-layout-builder.md` — migrate to purpose trigger
- Modified: `designbook-drupal/sample-data/rules/sample-canvas.md` — migrate to purpose trigger
- No breaking change to `data-model.yml` format — `purpose` is optional
