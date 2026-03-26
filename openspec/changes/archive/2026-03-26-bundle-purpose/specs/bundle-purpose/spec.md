## ADDED Requirements

### Requirement: Bundles may declare an optional purpose string
A bundle in `data-model.yml` MAY include a `purpose` string property. The value is open — no fixed enum. Rules document which purpose values they respond to.

#### Scenario: Bundle with purpose in data-model.yml
- **WHEN** a bundle is created with `purpose: landing-page`
- **THEN** `data-model.yml` contains `purpose: landing-page` on that bundle
- **AND** the schema validator accepts it without error

#### Scenario: Bundle without purpose is valid
- **WHEN** a bundle has no `purpose` property
- **THEN** the schema validator SHALL accept it without error
- **AND** rules that check purpose SHALL fall back to default behavior

### Requirement: Intake prompts for purpose per bundle
During data-model intake, the AI SHALL ask the user what purpose a bundle serves when the purpose is not obvious from context. Known purposes (from active extension rules) SHALL be presented as suggestions.

#### Scenario: User creates a landing page bundle
- **WHEN** the user says they need a landing page bundle
- **THEN** the AI sets `purpose: landing-page` on that bundle
- **AND** active extension rules apply their purpose-conditional logic

### Requirement: Purpose drives view_modes template in extension rules
Extension rules (layout-builder, canvas) SHALL check the bundle's purpose and set `view_modes.full.template` accordingly.

#### Scenario: layout-builder rule applies to landing-page bundle
- **WHEN** `layout_builder` extension is active AND a bundle has `purpose: landing-page`
- **THEN** `view_modes.full.template` is set to `layout-builder`
- **AND** all other view modes get `template: field-map`

#### Scenario: canvas rule applies to landing-page bundle
- **WHEN** `canvas` extension is active AND a bundle has `purpose: landing-page`
- **THEN** `view_modes.full.template` is set to `canvas`
- **AND** all other view modes get `template: field-map`

#### Scenario: No purpose — rule applies default
- **WHEN** a bundle has no `purpose`
- **THEN** extension rules do not override view_modes — standard field-map applies
