## MODIFIED Requirements

### Requirement: Dialog bootstrap loads rules via CLI
Before starting any dialog stage, the AI SHALL invoke `workflow rules --stage <workflow-id>:dialog` and apply the output as hard constraints before asking the user any questions.

#### Scenario: Rules loaded before first question
- **WHEN** a `debo-*` workflow dialog stage begins
- **THEN** `$DESIGNBOOK_CMD workflow rules --stage <id>:dialog` is run first
- **AND** all output content is applied as hard constraints
- **AND** only then does the AI ask the user the first question

#### Scenario: Empty output proceeds without error
- **WHEN** `workflow rules --stage <id>:dialog` returns no output
- **THEN** the AI proceeds with the dialog with no additional constraints

#### Scenario: Task stage rules loaded before execution
- **WHEN** a task stage (e.g. `create-tokens`, `create-component`) begins
- **THEN** `$DESIGNBOOK_CMD workflow rules --stage <stage-name>` is run before creating any files
- **AND** all output content is applied as hard constraints for that stage
