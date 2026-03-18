## ADDED Requirements

### Requirement: Panel SHALL display dialog-status workflows
The panel SHALL show workflows in `dialog` status with a distinct icon and no task list (tasks are not yet known during dialog phase).

#### Scenario: Dialog workflow displayed
- **WHEN** a `tasks.yml` with `status: dialog` exists in `workflows/changes/`
- **THEN** the panel SHALL render it with icon 💬 and the workflow title
- **AND** no task list SHALL be shown (tasks array is empty)
- **AND** the entry SHALL appear with reduced opacity to distinguish from active task work

#### Scenario: Dialog transitions to planning
- **WHEN** a workflow transitions from `status: dialog` to `status: planning`
- **THEN** the panel SHALL update to show the 📋 icon and the task list

### Requirement: Panel SHALL display parent workflow reference
When a `tasks.yml` contains a `parent` field, the panel SHALL show a reference to the triggering workflow below the workflow title.

#### Scenario: Parent reference shown
- **WHEN** a workflow's `tasks.yml` contains `parent: <name>`
- **THEN** the panel SHALL display "↳ `<parent-title>`" or "↳ `<parent-name>`" beneath the workflow title
- **AND** the parent reference SHALL use a muted/secondary text style
