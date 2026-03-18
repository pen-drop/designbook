## MODIFIED Requirements

### Requirement: CLI SHALL provide workflow create command with full task plan
The CLI SHALL provide a `workflow create` command that creates a new workflow tracking file with the complete task plan — including all task IDs, titles, types, and expected file paths. The workflow SHALL NOT start until the full plan is provided.

#### Scenario: Create workflow with task plan as inline JSON
- **WHEN** user runs `workflow create --workflow debo-design-shell --title "Design Shell" --tasks '[{"id":"create-page","title":"Create page","type":"component","files":["components/page/page.component.yml","components/page/page.twig","components/page/page.story.yml"]}]'`
- **THEN** a `tasks.yml` is created at `$DESIGNBOOK_DIST/workflows/changes/<name>/tasks.yml` with all tasks in `pending` status including their file lists
- **AND** the generated `<name>` is printed to stdout

#### Scenario: Create workflow with task plan from file
- **WHEN** user runs `workflow create --workflow debo-design-shell --title "Design Shell" --tasks-file /tmp/tasks.json`
- **THEN** the JSON file is read and the workflow is created identically to the inline form

#### Scenario: Generated name is unique
- **WHEN** `workflow create` is called
- **THEN** the generated name follows the pattern `<workflow-id>-<YYYY-MM-DD>-<4-char-hex>`

#### Scenario: Storybook sees full plan immediately
- **WHEN** `workflow create` completes
- **THEN** all tasks are visible in the Storybook panel as `pending` with their file lists before any file is created

### Requirement: CLI SHALL provide workflow validate command with task scope
The CLI SHALL provide a `workflow validate` command. When `--task <id>` is given, validation is scoped to files declared for that task in the plan (plus any added via `add-file`).

#### Scenario: Validate specific task
- **WHEN** user runs `workflow validate --workflow debo-design-shell-2026-03-17-a3f7 --task create-page`
- **THEN** only files declared for `create-page` are validated
- **AND** exit code is 0 if all pass, 1 if any fail

#### Scenario: Validate entire workflow
- **WHEN** user runs `workflow validate --workflow debo-design-shell-2026-03-17-a3f7` (no --task)
- **THEN** all files across all tasks are validated

### Requirement: CLI SHALL provide workflow done command
The CLI SHALL provide a `workflow done` command that marks a task as completed and triggers auto-archive when all tasks are done.

#### Scenario: Mark task done
- **WHEN** user runs `workflow done --workflow debo-design-shell-2026-03-17-a3f7 --task create-page`
- **THEN** the task `status` is set to `done` and `completed_at` is set

#### Scenario: Auto-archive on last task done
- **WHEN** `workflow done` marks the last pending/in-progress task as done
- **THEN** the workflow directory is moved from `workflows/changes/` to `workflows/archive/`

### Requirement: CLI SHALL provide workflow add-file command as escape hatch
The CLI SHALL provide a `workflow add-file` command for registering files not known at plan time.

#### Scenario: Add file not in plan
- **WHEN** user runs `workflow add-file --workflow debo-design-shell-2026-03-17-a3f7 --task create-page --file components/page/extra.twig`
- **THEN** the file is appended to the task's file list
- **AND** subsequent `validate --task create-page` includes this file

### Requirement: CLI SHALL provide workflow list command
The CLI SHALL provide a `workflow list --workflow <id>` command that lists all unarchived workflows for a given workflow id.

#### Scenario: No existing workflows
- **WHEN** user runs `workflow list --workflow debo-design-shell`
- **AND** no unarchived workflow with that id exists
- **THEN** the command prints nothing and exits with code 0

#### Scenario: Existing workflows found
- **WHEN** user runs `workflow list --workflow debo-design-shell`
- **AND** unarchived workflows exist
- **THEN** the command prints each name on a separate line, newest first

## REMOVED Requirements

### Requirement: CLI SHALL provide workflow create command with --task flags
**Reason**: Replaced by `--tasks '<json>'` / `--tasks-file <path>` — the full plan is passed at creation time, not built incrementally.
**Migration**: Pass all tasks as JSON array to `workflow create --tasks`.

### Requirement: CLI SHALL provide workflow update command with positional args
**Reason**: Replaced by `validate --task`, `done --task`, and `add-file` with consistent `--flag` style.
**Migration**: Use `workflow validate --task`, `workflow done --task`, `workflow add-file`.
