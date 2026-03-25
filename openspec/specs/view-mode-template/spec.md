## ADDED Requirements

### Requirement: view_modes map in data-model bundle

Each bundle in `data-model.yml` SHALL support an optional `view_modes` map. Each key is a view mode name (e.g. `teaser`, `full`, `default`) and its value is an object with a required `template` key and an optional `settings` map.

#### Scenario: Bundle with view_modes declared

- **WHEN** a bundle declares `view_modes.teaser.template: field-map`
- **THEN** the `map-entity` stage SHALL load `entity-mapping/field-map.md` from skills when generating the JSONata file for that view mode

#### Scenario: Multiple view modes with different templates

- **WHEN** a bundle declares `view_modes.teaser.template: field-map` and `view_modes.full.template: layout-builder`
- **THEN** `map-entity` SHALL use `field-map.md` for the teaser and `layout-builder.md` for the full view mode

#### Scenario: data-model schema validation — valid template key

- **WHEN** `data-model.yml` contains `view_modes.full.template: layout-builder`
- **THEN** the schema validator SHALL accept this without error

#### Scenario: data-model schema validation — missing template key

- **WHEN** `data-model.yml` contains `view_modes.full: {}` (no `template`)
- **THEN** the schema validator SHALL reject with a validation error

### Requirement: view_mode settings passed to template

A view_mode entry MAY include an optional `settings` object — a free-form map of key/value pairs. The `map-entity` stage SHALL pass these settings as context to the template file. The template file documents which settings it understands; the schema does not enforce any specific keys.

#### Scenario: Settings declared on a view mode

- **WHEN** a view_mode declares `settings: { wrapper: my_theme:page-content }`
- **THEN** `map-entity` SHALL make these settings available to the template instructions when generating the JSONata file

#### Scenario: Settings are optional

- **WHEN** a view_mode declares only `template` with no `settings`
- **THEN** the schema validator SHALL accept this without error

#### Scenario: Settings schema validation — free object

- **WHEN** a view_mode declares `settings` with any key/value structure
- **THEN** the schema validator SHALL accept it without error (no key enforcement)

### Requirement: map-entity loads matching template rule

The `map-entity` stage SHALL load the rule file matching `when: stages: [map-entity], template: {name}` from any skill, using the existing rule discovery mechanism, and apply it to generate the JSONata mapping file.

#### Scenario: Template rule discovery

- **WHEN** `map-entity` runs for a view mode with `template: field-map`
- **THEN** it SHALL load the rule file with `when: stages: [map-entity], template: field-map` from skills

#### Scenario: Drupal-specific template rule

- **WHEN** `map-entity` runs for a view mode with `template: layout-builder`
- **THEN** it SHALL load `designbook-drupal/scenes/rules/layout-builder.md`

#### Scenario: Settings passed to rule

- **WHEN** a view mode declares `template: layout-builder` and `settings: { wrapper: my_theme:page }`
- **THEN** the matched rule SHALL receive these settings as context when generating the JSONata file

#### Scenario: Unknown template

- **WHEN** `map-entity` runs for a view mode whose template has no matching rule in any skill
- **THEN** the stage SHALL stop and report which template is missing

## REMOVED Requirements

### Requirement: Composition field in data model schema

**Reason**: Replaced by per-view-mode `template` key in `view_modes`. The `composition` field encoded the same intent as a bundle-level boolean, conflating what should be per-view-mode decisions.

**Migration**: Replace `composition: unstructured` on a bundle with explicit `template` keys per view_mode. Use `template: layout-builder` or `template: canvas` for view modes that were previously "unstructured full". Use `template: field-map` for all other view modes.
