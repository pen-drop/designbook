## MODIFIED Requirements

### Requirement: template condition in create-sample-data rules

The `template` condition in rule `when:` blocks SHALL be supported in `create-sample-data` at two distinct levels:

1. **Field-level** (existing): `when: template: formatted-text` — rule applies when a field has `sample_template.template: formatted-text`. Governs the output value of a single field.
2. **Bundle-level** (new): `when: template: layout-builder` — rule applies when a bundle has `view_modes.<any_mode>.template: layout-builder`. Governs the overall record structure for that bundle when that view mode is being generated.

The CLI SHALL resolve and inject bundle-level template rules during `create-sample-data` stage planning, in the same way `map-entity` resolves view_mode template rules.

#### Scenario: bundle-level template rule loaded for layout-builder

- **WHEN** `create-sample-data` runs for a bundle with `view_modes.full.template: layout-builder`
- **THEN** the CLI SHALL load rule files matching `when: { stages: [create-sample-data], template: layout-builder }`
- **AND** apply those rules to determine the record structure for that bundle

#### Scenario: bundle-level template rule loaded for canvas

- **WHEN** `create-sample-data` runs for a bundle with `view_modes.full.template: canvas`
- **THEN** the CLI SHALL load rule files matching `when: { stages: [create-sample-data], template: canvas }`

#### Scenario: field-level template rules are unaffected

- **WHEN** a field has `sample_template.template: formatted-text`
- **THEN** field-level template rules still apply exactly as before — no change to existing behavior

#### Scenario: both levels can coexist

- **WHEN** a bundle uses `template: layout-builder` AND a field uses `sample_template.template: formatted-text`
- **THEN** both the bundle-level layout-builder rule AND the field-level formatted-text rule SHALL be active simultaneously

## ADDED Requirements

### Requirement: layout-builder sample data rule

The system SHALL provide a sample data rule for the `layout-builder` template context. When generating sample data for a bundle whose full view mode uses `template: layout-builder`, records SHALL include fields that represent the layout sections via block_content references.

#### Scenario: layout-builder sample data rule is loaded for matching context

- **WHEN** `create-sample-data` runs for a bundle with `view_modes.full.template: layout-builder`
- **AND** `DESIGNBOOK_BACKEND` is `drupal`
- **THEN** the CLI SHALL load `designbook-sample-data-drupal/rules/sample-layout-builder.md`

#### Scenario: layout-builder records use layout_builder__layout field

- **WHEN** sample data is generated for a node bundle with `template: layout-builder`
- **THEN** each record SHALL include a `layout_builder__layout` field containing a flat array of block_content entity references
- **AND** each entry SHALL identify the block_content bundle and record index (e.g. `{entity_type: block_content, bundle: hero, record: 0}`)
- **AND** the referenced block_content records SHALL exist in `data.yml`
- **AND** there SHALL be no further nesting — `layout_builder__layout` is a flat one-layer list

#### Scenario: layout-builder sample data count

- **WHEN** sample data is generated for a full view mode with `template: layout-builder`
- **THEN** at least 3 records SHALL be generated (as defined by the base sample data count rule)

#### Scenario: block_content sample data generated alongside node

- **WHEN** a node bundle uses `template: layout-builder`
- **AND** `block_content` bundles exist in `data-model.yml`
- **THEN** sample data for those block_content bundles SHALL be generated before node records that reference them

### Requirement: canvas sample data rule

The system SHALL provide a sample data rule for the `canvas` template context. When generating sample data for a bundle whose full view mode uses `template: canvas`, records SHALL include fields that represent the component configuration stored directly on the entity (no block_content indirection).

#### Scenario: canvas sample data rule is loaded for matching context

- **WHEN** `create-sample-data` runs for a bundle with `view_modes.full.template: canvas`
- **AND** `DESIGNBOOK_BACKEND` is `drupal`
- **THEN** the CLI SHALL load `designbook-sample-data-drupal/rules/sample-canvas.md`

#### Scenario: canvas records use component_tree field on canvas_page entity

- **WHEN** sample data is generated for a `canvas_page` bundle with `template: canvas`
- **THEN** each record SHALL include a `component_tree` field containing a component tree as inline data
- **AND** `component_tree` SHALL contain a top-level array of section components
- **AND** each section SHALL have a `children` array of `canvas_*` component entries (e.g. `canvas_text`, `canvas_image`, `canvas_cta`, `canvas_button`)
- **AND** each `canvas_*` entry SHALL carry its own `props` data inline — no entity references, no block_content
- **AND** Canvas uses entity type `canvas_page` (not `node`) — in `data-model.yml` this appears under `content.canvas_page.<bundle>`
- **NOTE** exact machine name of the component_tree field on `canvas_page` is TBD — needs verification against Canvas module source

#### Scenario: canvas sample data count

- **WHEN** sample data is generated for a full view mode with `template: canvas`
- **THEN** at least 3 records SHALL be generated (as defined by the base sample data count rule)
