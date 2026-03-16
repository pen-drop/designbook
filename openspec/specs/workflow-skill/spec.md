# workflow-skill Specification

## Purpose
TBD - created by archiving change refresh-generated-designbook-files. Update Purpose after archive.
## Requirements
### Requirement: Workflow skill provides task file utilities
A shared skill (`workflow-skill`) SHALL provide utilities for creating, updating, and archiving workflow task files. All `debo-*` workflows SHALL use this skill for task file I/O.

#### Scenario: Workflow starts
- **WHEN** a debo-* workflow begins execution
- **THEN** it SHALL use the workflow-skill to create a `tasks.yml` file in `designbook/workflows/changes/[change-name]/`
- **AND** the file SHALL contain the workflow title, workflow identifier, start timestamp, and full task list with all tasks in `pending` status

### Requirement: Task status updates
The workflow-skill SHALL provide a mechanism to update individual task statuses. When a task transitions to `in-progress`, `started_at` SHALL be set. When a task transitions to `done`, `completed_at` SHALL be set.

#### Scenario: Task starts
- **WHEN** a workflow updates a task to `in-progress`
- **THEN** the task's `started_at` SHALL be set to the current ISO 8601 timestamp
- **AND** the `tasks.yml` file SHALL be rewritten atomically

#### Scenario: Task completes
- **WHEN** a workflow updates a task to `done`
- **THEN** the task's `completed_at` SHALL be set to the current ISO 8601 timestamp
- **AND** the `tasks.yml` file SHALL be rewritten atomically

### Requirement: Workflow archival
When all tasks in a workflow are `done`, the workflow-skill SHALL set the top-level `completed_at` timestamp and move the directory from `designbook/workflows/changes/` to `designbook/workflows/archive/`.

#### Scenario: All tasks complete
- **WHEN** the last task in a workflow is updated to `done`
- **THEN** the top-level `completed_at` SHALL be set
- **AND** the directory SHALL be moved to `designbook/workflows/archive/[change-name]/`

### Requirement: Atomic file writes
The workflow-skill SHALL write task files atomically (write to temp file, then rename) to prevent partial reads by the Vite plugin watcher.

#### Scenario: Concurrent read during write
- **WHEN** the Vite plugin reads a `tasks.yml` while the workflow-skill is writing
- **THEN** the plugin SHALL always see a complete, valid YAML file

### Requirement: Idempotent workflow creation
If a `tasks.yml` already exists for a given change name, the workflow-skill SHALL update it rather than overwriting. This supports workflow resumption after interruption.

#### Scenario: Workflow resumed
- **WHEN** a workflow creates a task file but one already exists for that change name
- **THEN** the existing file SHALL be updated with any new tasks appended
- **AND** existing task statuses SHALL be preserved

