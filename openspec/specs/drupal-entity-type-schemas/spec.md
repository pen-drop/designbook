## Requirements

### Requirement: Entity type schema files define base fields per Drupal entity type
Each Drupal entity type supported by the designbook-drupal skill SHALL have a corresponding blueprint file at `.agents/skills/designbook-drupal/data-model/blueprints/<entity_type>.md` with frontmatter `type: entity-type`, `name: <entity_type>`, and `priority: 10`. The blueprint body contains a YAML code block declaring `entity_type`, `section` (content or config), and `base_fields`. Extension-specific entity types SHALL include `extensions` in their `when` condition.

#### Scenario: Blueprint file exists for each core entity type
- **WHEN** the change is applied
- **THEN** blueprint files SHALL exist for `node`, `media`, `taxonomy_term`, `block_content`, `canvas_page`, and `view` in `designbook-drupal/data-model/blueprints/`

#### Scenario: Each blueprint has correct frontmatter
- **WHEN** a blueprint file for entity type `node` is read
- **THEN** its frontmatter SHALL contain `type: entity-type`, `name: node`, `priority: 10`, `when.backend: drupal`, and `when.steps: [design-token:intake, data-model:intake]`

#### Scenario: Extension entity types carry extensions in when condition
- **WHEN** a blueprint file has `when.extensions: <id>` (e.g. `canvas_page` has `when.extensions: canvas`, `block_content` has `when.extensions: layout_builder`)
- **THEN** the blueprint SHALL only be resolved when that extension ID is present in `designbook.config.yml`

#### Scenario: Blueprint is resolved during create-data-model or intake step
- **WHEN** a workflow containing `data-model:intake` or `design-token:intake` is planned
- **THEN** matching entity-type blueprints SHALL appear in `task.blueprints[]` for the relevant task

#### Scenario: Project can override an entity-type blueprint
- **WHEN** a project skill defines a blueprint with `type: entity-type`, `name: node`, `priority: 20`
- **THEN** the project blueprint replaces the Drupal skill's `node` blueprint (priority 10) via deduplication

### Requirement: base_fields declares required status for each field
Each entry in `base_fields` SHALL have a `required` boolean. `required: true` means the field MUST always appear in `data-model.yml` for any bundle of that entity type. `required: false` means the field is optional and the AI SHALL ask the user whether the bundle uses it.

#### Scenario: Required base field always included
- **WHEN** a bundle of entity type `node` is created
- **THEN** `title` SHALL always be present in the bundle's fields without prompting

#### Scenario: Optional base field is prompted
- **WHEN** a bundle of entity type `node` is created
- **THEN** the AI SHALL ask whether the bundle needs a `body` field before including it

### Requirement: view entity type schema has config section, base_fields with rows, and requires view_modes
The `view` entity type SHALL live under `section: config` and declare `base_fields` including `rows` (type: view_rows, required: true), `items_per_page` (type: integer, required: false), `header`, `footer`, and `empty` (all type: text, required: false). Its blueprint SHALL mark `view_modes` as required.

#### Scenario: view bundle has rows in base_fields
- **WHEN** the `view` entity type blueprint is read
- **THEN** `base_fields` SHALL include `rows` with `type: view_rows` and `required: true`

#### Scenario: view bundle missing view_modes is flagged
- **WHEN** a `config.view.<bundle>` is created without any `view_modes` entry
- **THEN** the AI SHALL flag this as an error and prompt the user to declare at least one view mode
