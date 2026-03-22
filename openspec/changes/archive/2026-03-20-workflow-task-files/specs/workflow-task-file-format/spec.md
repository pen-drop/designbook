## ADDED Requirements

### Requirement: Task files SHALL use filename as stage selector
A task file's filename (without extension) SHALL match the stage name it applies to. No declaration of which workflow uses it is required.

#### Scenario: Task file for create-component stage
- **WHEN** a workflow executes stage `create-component`
- **THEN** the AI SHALL scan all `skills/*/tasks/create-component.md` files
- **AND** load those whose `when` conditions match the current config

#### Scenario: No when — always applies
- **WHEN** a task file has no `when` frontmatter field
- **THEN** it SHALL be loaded for any config when the stage name matches

### Requirement: Task file frontmatter SHALL contain when, params, and files
A task file SHALL have YAML frontmatter with `when` (optional), `params`, and `files`.

#### Scenario: Task file frontmatter structure
- **WHEN** `tasks/create-component.md` is read with `when: { component.framework: sdc }`
- **THEN** it SHALL only be loaded when `DESIGNBOOK_FRAMEWORK_COMPONENT=sdc`

#### Scenario: Param substitution in files
- **WHEN** the AI instantiates a task with `params: { component: page }`
- **THEN** `components/{{ component }}/{{ component }}.component.yml` resolves to `components/page/page.component.yml`
- **AND** resolved paths are passed to `workflow create --tasks '<json>'`

#### Scenario: Multiple task files match same stage
- **WHEN** two skills both have `tasks/create-component.md`
- **THEN** both are candidates; `when` conditions disambiguate which is loaded
- **AND** if both match, both are loaded (additive)

### Requirement: Rule files SHALL use when to scope to stages and config
A rule file in `skills/<name>/rules/` is a candidate for all stages. `when` narrows the scope.

#### Scenario: Rule scoped to stage
- **WHEN** `rules/drupal-field-naming.md` declares `when: { stage: create-data-model, backend: drupal }`
- **THEN** it SHALL only be applied during stage `create-data-model` when `DESIGNBOOK_BACKEND=drupal`

#### Scenario: Rule without stage scope
- **WHEN** a rule file has no `when.stage`
- **THEN** it SHALL be applied to all stages where its other `when` conditions match

#### Scenario: AI applies rules as constraints
- **WHEN** the AI executes a task and matching rule files are found
- **THEN** it SHALL apply all rule constraints during file creation for that task
- **AND** rule constraints are treated as hard requirements (same as SKILL.md rules)

### Requirement: Task and rule files SHALL live in their skill's subdirectories
Task files at `skills/<name>/tasks/<stage>.md`. Rule files at `skills/<name>/rules/<name>.md`.

#### Scenario: Correct file locations
- **WHEN** a task file applies to `create-component` for the SDC framework
- **THEN** it SHALL be at `.agents/skills/designbook-components-sdc/tasks/create-component.md`

#### Scenario: Rule file location
- **WHEN** a rule applies to Drupal data model naming
- **THEN** it SHALL be at `.agents/skills/designbook-data-model/rules/drupal-field-naming.md`
