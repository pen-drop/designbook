## 1. Config Loader — Extensions Format Upgrade

- [x] 1.1 Update config loader to accept both plain string and object format for `extensions` entries
- [x] 1.2 Expose `DESIGNBOOK_EXTENSION_SKILLS` env var (comma-separated skill IDs from extensions with `skill` declared)
- [x] 1.3 Validate that unknown skill IDs in `skill` field are silently ignored (no error thrown)
- [x] 1.4 Update `designbook.config.yml` schema documentation with new `extensions` object format and `url` + `skill` fields

## 2. Extension Loading — Two Mechanisms

- [x] 2.1 Add `when.extensions` as a new condition key in the rule-file scanner — checks against `DESIGNBOOK_EXTENSIONS` (same pattern as `when.backend`)
- [x] 2.2 Update `architecture.md` to document `when.extensions` condition key
- [x] 2.3 Update workflow stage resolver to read `DESIGNBOOK_EXTENSION_SKILLS` and inject matching skills into `config_instructions` of each stage
- [x] 2.4 Verify that extension-declared skills are loaded with lower priority than explicit stage rules (extension skills augment, not override)

## 3. Data Model Intake — Extension Awareness

- [x] 3.1 Update `.agents/skills/designbook-data-model/tasks/intake.md` — add Step 0: read extensions from config; if empty, note that extensions can be added manually to `designbook.config.yml`
- [x] 3.2 Add URL-fetch instruction: for each extension with `url` and no `skill`, fetch the page before proposing entities/fields

## 4. Drupal Data Model Rule Update

- [x] 4.1 Rewrite `.agents/skills/designbook-data-model-drupal/rules/drupal-data-model.md` — replace static layout-system comments; document that extension-specific rules load via `when.extensions`
- [x] 4.2 Create rule file for Canvas: `when: extensions: canvas, stages: [create-data-model, designbook-data-model:intake]` — suggest `canvas_page` entity type; set `view_modes.full.template: canvas` on canvas_page bundles
- [x] 4.3 Create rule file for Layout Builder: `when: extensions: layout_builder, stages: [create-data-model, designbook-data-model:intake]` — suggest `block_content`; set `view_modes.full.template: layout-builder` on landing page node bundles; set `view_modes.default.template: field-map` on block_content bundles
- [x] 4.4 Document Paragraphs in the base rule as example of `skill`-based extension (no rule file needed, dedicated skill handles it)

## 5. Mapping Template Rules — Layout Builder + Canvas

- [x] 5.1 Create `.agents/skills/designbook-scenes-drupal/rules/layout-builder.md` — `when: stages: [map-entity], template: layout-builder` — JSONata reads `layout_builder__layout` field, outputs flat ComponentNode[] of block_content entity references
- [x] 5.2 Create `.agents/skills/designbook-scenes-drupal/rules/canvas.md` — `when: stages: [map-entity], template: canvas` — JSONata reads `component_tree` field on `canvas_page` entity, outputs nested ComponentNode[] (verify exact field machine name before writing)

## 6. CLI — Bundle-Level Template Condition in create-sample-data

- [x] 6.1 Extend CLI rule scanner: in `create-sample-data` stage, resolve `when: template: <name>` at bundle level (check `view_modes.*.template` in data-model.yml), same mechanism as `map-entity` does for view_mode templates
- [x] 6.2 Verify field-level `when: template:` behavior is unaffected (field's `sample_template.template` still works as before)

## 7. Sample Data Rules — Layout Builder + Canvas

- [x] 7.1 Create `.agents/skills/designbook-sample-data-drupal/rules/sample-layout-builder.md` — `when: stages: [create-sample-data], template: layout-builder, backend: drupal` — generates `layout_builder__layout` field: flat array of block_content entity refs
- [x] 7.2 Create `.agents/skills/designbook-sample-data-drupal/rules/sample-canvas.md` — `when: stages: [create-sample-data], template: canvas, backend: drupal` — generates `component_tree` field on `canvas_page`: nested section + canvas_* component tree inline (verify exact field machine name first)
- [x] 7.3 Verify `create-sample-data.md` step ordering ensures block_content records are generated before node records that reference them (layout-builder case)

## 7. Documentation

- [x] 7.1 Update `.agents/skills/designbook-workflow/resources/architecture.md` — add `when.extensions` to the condition keys table
- [x] 7.2 Update `designbook.config.yml` schema docs — document `extensions` object format with `id`, `url`, `skill` fields
