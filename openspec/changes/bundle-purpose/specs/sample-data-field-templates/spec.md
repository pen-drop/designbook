## MODIFIED Requirements

### Requirement: Sample rules for complex templates triggered by bundle purpose
Sample data rules for layout-builder and canvas SHALL be triggered by bundle `purpose` rather than field-level `sample_template.template`. The `layout_builder__layout` and `components` fields no longer require `sample_template` to activate their respective sample rules.

#### Scenario: layout-builder sample data triggered by purpose
- **WHEN** a bundle has `purpose: landing-page` AND `layout_builder` extension is active
- **THEN** `sample-layout-builder.md` rule applies to generate `layout_builder__layout` sample data
- **AND** the field does NOT need `sample_template: { template: layout_builder }` to trigger this

#### Scenario: canvas sample data triggered by purpose
- **WHEN** a bundle has `purpose: landing-page` AND `canvas` extension is active
- **THEN** `sample-canvas.md` rule applies to generate `components` sample data
- **AND** the field does NOT need `sample_template: { template: canvas }` to trigger this

#### Scenario: Simple field sample_templates unchanged
- **WHEN** a field has `sample_template: { template: formatted-text }`
- **THEN** the formatted-text sample rule applies as before — field-level sample_template is unchanged for simple types
