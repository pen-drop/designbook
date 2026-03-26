## ADDED Requirements

### Requirement: Entity type schema files define base fields per Drupal entity type
Each Drupal entity type supported by the designbook-drupal skill SHALL have a corresponding YAML schema file at `.agents/skills/designbook-drupal/data-model/entity-types/<entity_type>.yml`. The schema declares `entity_type`, `section` (content or config), optional `extensions` condition, and `base_fields`.

#### Scenario: Schema file exists for each core entity type
- **WHEN** the entity-type-schemas change is applied
- **THEN** schema files exist for `node`, `media`, `taxonomy_term`, `block_content`, `canvas_page`, and `view`

#### Scenario: Extension entity types carry extensions condition
- **WHEN** a schema file has `extensions: [<id>]`
- **THEN** the schema is only applied when that extension ID is present in `designbook.config.yml`

### Requirement: base_fields declares required status for each field
Each entry in `base_fields` SHALL have a `required` boolean. `required: true` means the field must always appear in `data-model.yml` for any bundle of that entity type. `required: false` means the field is optional and the AI SHALL ask the user whether the bundle uses it.

#### Scenario: Required base field always included
- **WHEN** a bundle of entity type `node` is created
- **THEN** `title` and `status` are always present in the bundle's fields without prompting

#### Scenario: Optional base field is prompted
- **WHEN** a bundle of entity type `node` is created
- **THEN** the AI asks whether the bundle needs a `body` field before including it

### Requirement: view entity type schema has no base_fields and requires view_modes
The `view` entity type lives under `section: config` and has no declarable fields. Its schema SHALL have `base_fields: []` and mark `view_modes` as required.

#### Scenario: view bundle has no fields in data-model.yml
- **WHEN** a `config.view.<bundle>` is created
- **THEN** no `fields` key appears in the bundle — only `view_modes`

#### Scenario: view bundle missing view_modes is flagged
- **WHEN** a `config.view.<bundle>` is created without any `view_modes` entry
- **THEN** the AI flags this as an error and prompts the user to declare at least one view mode
