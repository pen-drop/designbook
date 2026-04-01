## MODIFIED Requirements

### Requirement: Every debo workflow SHALL track progress via CLI

Phase 1 Step 3 (Load Intake Instructions) SHALL explicitly instruct the agent to read the `task_file` path returned by `workflow instructions`. The instruction text SHALL state: "Read the `task_file` path from the output to load the actual task content and instructions."

Phase 1 Step 3 SHALL include a quiet-mode instruction: "If the user explicitly requests no confirmation (e.g. 'ohne Rücksprache', 'just do it'), skip the intake confirmation and proceed directly."

#### Scenario: Agent reads task_file after workflow instructions
- **WHEN** the agent calls `workflow instructions --stage intake`
- **AND** the output contains `task_file: /path/to/intake--vision.md`
- **THEN** the agent SHALL read `/path/to/intake--vision.md` to get the actual task content

#### Scenario: User requests no confirmation
- **WHEN** the user explicitly says to skip confirmation (e.g. "ohne Rücksprache")
- **THEN** the agent SHALL skip the intake confirmation step and proceed directly to planning

### Requirement: Intake task files SHALL not describe workflow control flow

Intake task files (`intake--*.md`) SHALL describe only what information to gather from the user. They SHALL NOT contain instructions about proceeding to specific stages or workflow control flow. Workflow sequencing is the responsibility of `workflow-execution.md`.

#### Scenario: Intake task describes data gathering only
- **WHEN** an intake task file contains instructions
- **THEN** the instructions SHALL describe fields to extract and validation rules
- **AND** the instructions SHALL NOT contain phrases like "proceed to", "continue to", or "go to" followed by a stage name

#### Scenario: Intake completion signaling
- **WHEN** all required fields have been gathered
- **THEN** the intake task file SHALL signal completion with neutral language (e.g. "intake is complete")
- **AND** SHALL NOT reference the next stage by name
