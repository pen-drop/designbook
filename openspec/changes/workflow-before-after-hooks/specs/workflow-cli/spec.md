## ADDED Requirements

### Requirement: CLI SHALL provide workflow list command with archive support
The CLI SHALL provide a `designbook workflow list` command. With `--include-archived`, it also scans the archive directory.

#### Scenario: List active workflows only
- **WHEN** user runs `designbook workflow list --workflow debo-design-tokens`
- **THEN** the CLI SHALL print names from `workflows/changes/` whose `workflow` field matches, one per line
- **AND** if no entries exist, output SHALL be empty (exit 0)

#### Scenario: List with archived workflows included
- **WHEN** user runs `designbook workflow list --workflow debo-design-tokens --include-archived`
- **THEN** the CLI SHALL also scan `workflows/archive/` and include matching names
- **AND** output SHALL list all matching workflow names (active + archived), one per line

#### Scenario: Workflow never run — empty output
- **WHEN** user runs `designbook workflow list --workflow <id> --include-archived`
- **AND** no matching tasks.yml files exist in changes or archive
- **THEN** output SHALL be empty (exit 0)

### Requirement: `workflow create` SHALL support dialog-status creation with optional parent
`workflow create` SHALL accept `--status dialog` to create a skeleton workflow entry before tasks are known. When `--status dialog` is used, `--stages` and `--tasks` SHALL be omitted. An optional `--parent` flag stores the triggering workflow name.

#### Scenario: Create dialog-status workflow
- **WHEN** user runs `designbook workflow create --workflow debo-vision --title "Define Product Vision" --status dialog`
- **THEN** a `tasks.yml` is created at `workflows/changes/<name>/tasks.yml` with `status: dialog` and an empty `tasks: []`
- **AND** the generated `<name>` is printed to stdout

#### Scenario: Create with parent reference
- **WHEN** user runs `designbook workflow create --workflow debo-design-tokens --title "Design Tokens" --status dialog --parent debo-design-component-2026-03-18-a3f7`
- **THEN** the `tasks.yml` SHALL contain `parent: debo-design-component-2026-03-18-a3f7`

#### Scenario: Create without status — existing behavior preserved
- **WHEN** user runs `designbook workflow create` with `--stages` and `--tasks` (no `--status dialog`)
- **THEN** behavior is unchanged: workflow is created directly at `planning` status

### Requirement: CLI SHALL provide `workflow plan` command
The `workflow plan` command adds stages and tasks to an existing `dialog`-status workflow, transitioning it to `planning`.

#### Scenario: Plan transitions dialog to planning
- **WHEN** user runs `designbook workflow plan --workflow <name> --stages '<json>' --tasks '<json>'`
- **AND** the workflow at `<name>` has `status: dialog`
- **THEN** the tasks are written, stages are set, and `status` transitions to `planning`

#### Scenario: Plan on non-dialog workflow fails
- **WHEN** user runs `designbook workflow plan` on a workflow with `status: planning` or `running`
- **THEN** the CLI SHALL exit with error code 1 and print an error message
