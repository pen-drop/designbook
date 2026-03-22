## MODIFIED Requirements

### Requirement: Dialog bootstrap loads rules via CLI
Before starting any dialog stage, the AI SHALL invoke `workflow rules --stage <workflow-id>:dialog` and apply the output as hard constraints before asking the user any questions.

**Replaces with:**

The intake stage SHALL be processed by Rule 5 (task execution) like all other stages. Rule 2 (dialog bootstrap) is eliminated.

#### Scenario: Intake stage processed by Rule 5
- **WHEN** the intake stage begins
- **THEN** the AI applies Rule 5a (reads check) and Rule 5b (stage execution) identically to all other stages
- **AND** no special bootstrap step is needed before the intake stage

#### Scenario: Rule 2 no longer exists
- **WHEN** `workflow-execution.md` is read
- **THEN** it contains no Rule 2 section
- **AND** Rule 5 covers intake stage processing fully

### Requirement: workflow validate with empty files passes
The `workflow validate` command SHALL exit 0 when the task declares `files: []`.

#### Scenario: Empty files array skips validation
- **WHEN** `workflow validate` is called for a task with `files: []`
- **THEN** exit code is 0
- **AND** output indicates no files to validate
