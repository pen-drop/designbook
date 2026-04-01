## MODIFIED Requirements

### Requirement: Entity type schema files define base fields per Drupal entity type
Each Drupal entity type supported by the designbook-drupal skill SHALL have a corresponding blueprint file at `.agents/skills/designbook-drupal/blueprints/<entity_type>.md` with frontmatter `type: entity-type`, `name: <entity_type>`, and `priority: 10`. The blueprint body contains a YAML code block declaring `entity_type`, `section` (content or config), and `base_fields`. Extension-specific entity types SHALL include `extensions` in their `when` condition.

#### Scenario: Blueprint file exists for each core entity type
- **WHEN** the change is applied
- **THEN** blueprint files exist for `node`, `media`, `taxonomy_term`, `block_content`, `canvas_page`, and `view` in `designbook-drupal/blueprints/`

#### Scenario: Each blueprint has correct frontmatter
- **WHEN** a blueprint file for entity type `node` is read
- **THEN** its frontmatter contains `type: entity-type`, `name: node`, `priority: 10`, and `when.backend: drupal`

#### Scenario: Extension entity types carry extensions in when condition
- **WHEN** a blueprint file has `when.extensions: [<id>]`
- **THEN** the blueprint is only resolved when that extension ID is present in `designbook.config.yml`

#### Scenario: Blueprint is resolved during create-data-model step
- **WHEN** a workflow containing `create-data-model` is planned
- **THEN** matching entity-type blueprints appear in `task.blueprints[]` for the create-data-model task

#### Scenario: Project can override an entity-type blueprint
- **WHEN** a project skill defines a blueprint with `type: entity-type`, `name: node`, `priority: 20`
- **THEN** the project blueprint replaces the Drupal skill's `node` blueprint (priority 10) via deduplication

### Requirement: base_fields declares required status for each field
Each entry in `base_fields` SHALL have a `required` boolean. `required: true` means the field must always appear in `data-model.yml` for any bundle of that entity type. `required: false` means the field is optional and the AI SHALL ask the user whether the bundle uses it.

#### Scenario: Required base field always included
- **WHEN** a bundle of entity type `node` is created
- **THEN** `title` and `status` are always present in the bundle's fields without prompting

#### Scenario: Optional base field is prompted
- **WHEN** a bundle of entity type `node` is created
- **THEN** the AI asks whether the bundle needs a `body` field before including it

### Requirement: view entity type schema has no base_fields and requires view_modes
The `view` entity type lives under `section: config` and has no declarable fields. Its blueprint SHALL have `base_fields: []` and mark `view_modes` as required.

#### Scenario: view bundle has no fields in data-model.yml
- **WHEN** a `config.view.<bundle>` is created
- **THEN** no `fields` key appears in the bundle — only `view_modes`

#### Scenario: view bundle missing view_modes is flagged
- **WHEN** a `config.view.<bundle>` is created without any `view_modes` entry
- **THEN** the AI flags this as an error and prompts the user to declare at least one view mode

## REMOVED Requirements

### Requirement: Entity type definitions live as rule files
**Reason**: Replaced by blueprint-based delivery with priority override support.
**Migration**: Read entity-type definitions from `task.blueprints[]` filtered by `type: entity-type` instead of from implicitly loaded rules.
