## ADDED Requirements

### Requirement: Intake done implicitly triggers plan

The CLI command `workflow done --task intake` SHALL accept an optional `--params '<json>'` argument. When provided, the CLI MUST automatically execute the plan logic (expanding iterables into tasks) before marking intake as done. The response SHALL include the expanded task list.

#### Scenario: Intake done with params triggers implicit plan
- **WHEN** the agent calls `workflow done --workflow $WORKFLOW_NAME --task intake --params '<json>'`
- **THEN** the CLI expands iterables into tasks (same logic as `workflow plan`), marks intake as done, and returns the expanded task list in the response

#### Scenario: No premature archival
- **WHEN** the agent calls `workflow done --task intake --params '<json>'`
- **THEN** the workflow is NOT archived because the implicit plan created additional tasks before the done-check runs

#### Scenario: Intake done without params for singleton workflows
- **WHEN** the agent calls `workflow done --task intake` without `--params`
- **THEN** the CLI calls plan with empty params `{}` (singleton workflow behavior), marks intake as done, and returns the response

### Requirement: Remove standalone workflow plan command

The `workflow plan` CLI command SHALL be removed. Plan logic is exclusively triggered via `workflow done --task intake --params`. This simplifies the CLI API surface.

#### Scenario: workflow plan command no longer exists
- **WHEN** an agent calls `workflow plan --workflow $WORKFLOW_NAME --params '<json>'`
- **THEN** the CLI returns an error indicating that plan is now implicit in `workflow done --task intake --params`
