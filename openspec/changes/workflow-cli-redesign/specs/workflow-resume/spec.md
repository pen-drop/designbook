## ADDED Requirements

### Requirement: CLI SHALL provide workflow list command
The CLI SHALL provide a `workflow list --workflow <id>` command that lists all unarchived workflows for a given workflow id.

#### Scenario: No existing workflows
- **WHEN** user runs `workflow list --workflow debo-design-shell`
- **AND** no unarchived workflow with that id exists
- **THEN** the command prints nothing and exits with code 0

#### Scenario: One existing workflow
- **WHEN** user runs `workflow list --workflow debo-design-shell`
- **AND** one unarchived workflow `debo-design-shell-2026-03-17-a3f7` exists
- **THEN** the command prints `debo-design-shell-2026-03-17-a3f7` to stdout

#### Scenario: Multiple existing workflows
- **WHEN** user runs `workflow list --workflow debo-design-shell`
- **AND** multiple unarchived workflows exist for that id
- **THEN** the command prints each name on a separate line, newest first

### Requirement: AI SHALL check for existing workflows before creating
The AI SHALL run `workflow list --workflow <id>` before calling `workflow create`, so it can offer the user a choice to resume or start fresh.

#### Scenario: AI resumes existing workflow
- **WHEN** `workflow list` returns one or more names
- **THEN** the AI SHALL ask the user: "There is an unfinished workflow: <name>. Continue it, or start fresh?"
- **AND** if user chooses continue, the AI SHALL use the existing `$WORKFLOW_NAME` and skip `workflow create`

#### Scenario: AI starts fresh
- **WHEN** user chooses to start fresh
- **THEN** the AI SHALL call `workflow create` to get a new `$WORKFLOW_NAME`
