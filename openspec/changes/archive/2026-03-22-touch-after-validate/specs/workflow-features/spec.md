## MODIFIED Requirements

### Requirement: CLI provides workflow done command

`workflow done --workflow <name> --task <id>` marks a task as complete. After validation checks pass and the task status is set to `done`, the command SHALL touch (update modification timestamp) all files in `task.files[]` that exist on disk. If all tasks are complete, the workflow is archived.

#### Scenario: Task marked done with file touch
- **WHEN** `workflow done` is called with valid workflow and task
- **AND** all validation checks pass
- **THEN** the task status is set to `done`
- **AND** all existing task files have their modification timestamps updated
- **AND** if all tasks are complete, the workflow is archived
