## MODIFIED Requirements

### Requirement: Sub-workflow tasks in execute stage

The workflow execution rules SHALL support a task type that instructs the agent to start and complete a sub-workflow. The `run-workflow` task provides the sub-workflow ID, pre-filled params, and the parent workflow name.

#### Scenario: Agent receives run-workflow task

- **WHEN** the agent loads a `run-workflow` task from the execute stage
- **THEN** the task context SHALL contain the sub-workflow ID (e.g., `vision`, `tokens`, `design-screen`)
- **AND** the task context SHALL contain pre-filled params as a JSON object
- **AND** the agent SHALL follow the standard workflow execution flow (Phase 0 → Phase 1 → Phase 2) for the sub-workflow

#### Scenario: Pre-filled params used as intake defaults

- **WHEN** the agent executes a sub-workflow's intake with pre-filled params
- **THEN** the agent SHALL present the pre-filled values as defaults to the user
- **AND** the user MAY accept, modify, or reject each value
- **AND** the intake SHALL proceed with the user's choices

#### Scenario: Sub-workflow completion returns to parent

- **WHEN** a sub-workflow completes (all tasks done)
- **THEN** the agent SHALL mark the corresponding `run-workflow` task as done in the parent workflow
- **AND** the agent SHALL proceed to the next task in the parent's execute stage
