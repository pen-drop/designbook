## ADDED Requirements

### Requirement: workflow plan matches blueprint files per stage

`workflow plan` SHALL scan `.agents/skills/*/blueprints/*.md` frontmatter and store matched blueprint file paths per task, using the same `when` condition matching as rules.

#### Scenario: Blueprint file matched by step
- **WHEN** a blueprint file has `when.steps: [map-entity]` and a task has step `map-entity`
- **THEN** the blueprint file path is included in the task's `blueprints` array

#### Scenario: Blueprint file matched by config condition
- **WHEN** a blueprint file has `when: { backend: drupal }` and config has `DESIGNBOOK_BACKEND: drupal`
- **THEN** the blueprint file path is included for all tasks whose step matches

#### Scenario: Scanned blueprints merged with declared blueprints
- **WHEN** a workflow's frontmatter declares blueprints for a stage (e.g., intake declares `section.md`)
- **AND** additional blueprint files match the stage via `when.steps` scanning
- **THEN** both sources are merged into the task's `blueprints` array, deduplicated by absolute path

#### Scenario: Frontmatter blueprints take precedence
- **WHEN** a blueprint is declared in both frontmatter and matched by scanning
- **THEN** only one entry appears in `blueprints[]` (deduplicated)

#### Scenario: Data-mapping blueprints loaded for map-entity
- **WHEN** `map-entity` stage resolves tasks
- **AND** `designbook-drupal/data-mapping/blueprints/canvas.md` has `when.steps: [map-entity]`
- **THEN** `canvas.md` appears in the task's `blueprints` array alongside `field-map.md`, `layout-builder.md`, and `views.md`
