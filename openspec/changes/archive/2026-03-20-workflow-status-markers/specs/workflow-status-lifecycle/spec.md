## ADDED Requirements

### Requirement: Workflow status field
The system SHALL store a `status` field on each workflow with values: `planning`, `running`, or `completed`.

#### Scenario: Workflow creation sets planning status
- **WHEN** `designbook-workflow create` is executed
- **THEN** the created tasks.yml file contains `status: planning`

#### Scenario: Workflow transitions to running
- **WHEN** the first file is registered via `designbook-workflow update --files <path>`
- **THEN** the workflow status automatically transitions from `planning` to `running`

#### Scenario: Workflow transitions to completed
- **WHEN** the last task's status is set to `done` via `designbook-workflow update --status done`
- **THEN** the workflow status automatically transitions to `completed` and the workflow is moved to `workflows/archive/`

### Requirement: Status is persisted in tasks.yml
The workflow's `status` field SHALL be written to and read from the tasks.yml file alongside other workflow metadata.

#### Scenario: Status survives reload
- **WHEN** a workflow is created with status `planning`, then the file is read back from disk
- **THEN** the `status: planning` is present in the parsed YAML

#### Scenario: Status updates are atomic
- **WHEN** a workflow status changes (e.g., from `planning` to `running`)
- **THEN** the file is written atomically (temp file + rename) to prevent corruption

### Requirement: Panel displays workflow status
The Storybook panel SHALL display a visual indicator for each workflow status:
- 📋 for `planning`
- ⚡ for `running`
- ✅ for `completed`

#### Scenario: Planning status shows paper icon
- **WHEN** a workflow has `status: planning`
- **THEN** the panel row displays 📋 icon

#### Scenario: Running status shows lightning icon
- **WHEN** a workflow has `status: running`
- **THEN** the panel row displays ⚡ icon

#### Scenario: Completed status shows checkmark icon
- **WHEN** a workflow has `status: completed` (archived)
- **THEN** the panel row displays ✅ icon
