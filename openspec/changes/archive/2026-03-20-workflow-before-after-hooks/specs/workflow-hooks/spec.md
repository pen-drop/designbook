## ADDED Requirements

### Requirement: Workflow frontmatter SHALL support before/after hook declarations
A `debo-*.md` workflow file SHALL be able to declare `before` and `after` arrays in its frontmatter. Each entry references another workflow by its slash-command name.

#### Scenario: Before hook declared
- **WHEN** a workflow frontmatter contains a `before` array entry with `workflow` and `execute` fields
- **THEN** the AI SHALL process it after the current workflow's dialog and before task execution

#### Scenario: After hook declared
- **WHEN** a workflow frontmatter contains an `after` array entry with a `workflow` field
- **THEN** the AI SHALL prompt the user to run it after the current workflow completes

#### Scenario: No hooks declared
- **WHEN** a workflow frontmatter has no `before` or `after` arrays
- **THEN** the workflow executes normally with no change in behavior

### Requirement: Before hooks SHALL execute after the dialog, before tasks
Before hooks run in the window between dialog completion and task execution. They never interrupt the user mid-dialog or mid-task.

#### Scenario: Before hook timing
- **WHEN** the dialog stage of a workflow completes
- **THEN** the AI SHALL process all `before` hooks before creating the workflow plan or executing any tasks

### Requirement: Before hooks SHALL support three execution policies

#### Scenario: execute: always
- **WHEN** a before hook has `execute: always`
- **AND** the referenced workflow's `reads:` are all satisfied
- **THEN** the AI SHALL run the referenced workflow without asking the user

#### Scenario: execute: if-never-run — never run
- **WHEN** a before hook has `execute: if-never-run`
- **AND** `workflow list --workflow <id> --include-archived` returns empty output
- **AND** the referenced workflow's `reads:` are all satisfied
- **THEN** the AI SHALL run the referenced workflow without asking the user

#### Scenario: execute: if-never-run — already ran
- **WHEN** a before hook has `execute: if-never-run`
- **AND** `workflow list --workflow <id> --include-archived` returns one or more entries
- **THEN** the AI SHALL skip the before hook silently

#### Scenario: execute: ask
- **WHEN** a before hook has `execute: ask`
- **AND** the referenced workflow's `reads:` are all satisfied
- **THEN** the AI SHALL ask the user whether to run the referenced workflow before proceeding

### Requirement: Before hooks SHALL be skipped when reads are unsatisfied
The referenced workflow's `reads:` entries act as a gate — missing required reads bypass the policy entirely.

#### Scenario: Reads not satisfied — skip
- **WHEN** a before hook's referenced workflow declares `reads:` entries
- **AND** one or more required (non-optional) read files do not exist
- **THEN** the AI SHALL skip the before hook silently

#### Scenario: Reads satisfied — apply policy
- **WHEN** all required `reads:` files of the referenced workflow exist
- **THEN** the AI SHALL apply the `execute` policy normally

### Requirement: After hooks SHALL always prompt the user

#### Scenario: After hook prompt
- **WHEN** the current workflow's last task completes successfully
- **AND** the workflow declares one or more `after` entries
- **THEN** the AI SHALL prompt the user for each after-workflow in order

#### Scenario: User accepts after hook
- **WHEN** the user confirms an after-hook prompt
- **THEN** the AI SHALL start the referenced workflow

#### Scenario: User declines after hook
- **WHEN** the user declines an after-hook prompt
- **THEN** the AI SHALL skip it and continue to the next after entry (if any)

### Requirement: Triggered workflows SHALL store their parent
When a workflow is started via a before or after hook, the triggering workflow's name SHALL be passed as `--parent` to `workflow create`.

#### Scenario: Hook-triggered workflow stores parent
- **WHEN** workflow A triggers workflow B via a before or after hook
- **AND** B's `workflow create` is called
- **THEN** `--parent $WORKFLOW_NAME_A` SHALL be passed
- **AND** B's `tasks.yml` SHALL contain `parent: <workflow-A-name>`

#### Scenario: Directly started workflow has no parent
- **WHEN** a workflow is started directly by the user (not via a hook)
- **THEN** no `--parent` flag is passed and `tasks.yml` has no `parent` field
