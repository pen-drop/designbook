## ADDED Requirements

### Requirement: view_modes map in data-model bundle
Each bundle in `data-model.yml` supports an optional `view_modes` map. Each key is a view mode name (e.g. `teaser`, `full`) with a required `template` key and optional `settings` map.

- `view_modes.teaser.template: field-map` causes `map-entity` to load `entity-mapping/field-map.md`
- Different view modes can use different templates
- Schema validates `template` is required; missing `template` is a validation error

### Requirement: view_mode settings passed to template
A view_mode MAY include `settings` — a free-form key/value map passed as context to the template. Schema does not enforce specific keys.

- Settings available to template instructions during JSONata generation
- Settings are optional; omitting them is valid

### Requirement: map-entity loads matching template rule
`map-entity` SHALL load the rule matching `when: stages: [map-entity], template: {name}` from any skill.

- `template: field-map` loads the rule with `template: field-map`
- `template: layout-builder` loads `designbook-drupal/scenes/rules/layout-builder.md`
- Settings from the view mode are passed to the matched rule as context
- Unknown template with no matching rule: stage stops and reports which template is missing

## REMOVED Requirements

### Requirement: Composition field in data model schema
**Reason**: Replaced by per-view-mode `template` key. `composition` conflated bundle-level intent with per-view-mode decisions.
**Migration**: Replace `composition: unstructured` with explicit `template` keys per view_mode (`layout-builder`/`canvas` for unstructured, `field-map` for others).
