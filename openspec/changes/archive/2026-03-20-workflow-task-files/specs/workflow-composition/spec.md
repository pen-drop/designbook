## ADDED Requirements

### Requirement: Workflow frontmatter SHALL declare only stages
A workflow file SHALL declare a `stages` array as the only structural metadata. No `task_files` map — task files are discovered automatically by stage name and config.

#### Scenario: Minimal workflow frontmatter
- **WHEN** `debo-design-shell.md` is read
- **THEN** its frontmatter SHALL contain only:
  ```yaml
  workflow:
    title: Design Shell
    stages: [dialog, create-component, create-scene]
  ```
- **AND** no `task_files` or `tasks` array

### Requirement: Tasks are collected at runtime after dialog stage
Concrete task instances (ids, params) SHALL be determined by the AI after the dialog stage completes — never declared in workflow frontmatter.

#### Scenario: Tasks collected after dialog
- **WHEN** the `dialog` stage completes
- **THEN** the AI SHALL determine which task files to instantiate for each remaining stage
- **AND** substitute params from the dialog result
- **AND** call `workflow create --tasks '<json>'` with all tasks before any file creation

#### Scenario: Task discovery for a stage
- **WHEN** the AI collects tasks for stage `create-component`
- **THEN** it SHALL scan all skills for `tasks/create-component.md`
- **AND** filter by `when` conditions against current config
- **AND** instantiate one task entry per logical unit (e.g. one per component)

### Requirement: tasks.yml SHALL store stages array and stage field per task
The `stages` array (from workflow) SHALL be written to tasks.yml for ordering. Each task SHALL have a flat `stage` field.

#### Scenario: tasks.yml structure
- **WHEN** `workflow create --tasks '<json>'` runs
- **THEN** tasks.yml SHALL contain a top-level `stages` array
- **AND** each task entry SHALL have a `stage` field matching one of those stages
- **AND** NO nesting or parent/child relationships between tasks

### Requirement: Stage order defines execution sequence
The AI SHALL complete all tasks of a stage before starting the next stage.

#### Scenario: Stage gate
- **WHEN** all tasks in stage `create-component` reach status `done`
- **THEN** the AI SHALL proceed to stage `create-scene`

#### Scenario: Within-stage order is free
- **WHEN** stage `create-component` has tasks create-page, create-header, create-footer
- **THEN** the AI MAY execute them in any order
