## ADDED Requirements

### Requirement: CLI SHALL provide workflow create command
The CLI SHALL provide a `designbook workflow create` command that creates a new workflow tracking file with a unique name.

#### Scenario: Create single-task workflow
- **WHEN** user runs `designbook workflow create --workflow debo-vision --title "Define Product Vision" --task create-vision "Create product vision" data`
- **THEN** a `tasks.yml` is created at `$DESIGNBOOK_DIST/workflows/changes/<name>/tasks.yml` with the task in `pending` status
- **AND** the generated `<name>` is printed to stdout

#### Scenario: Create multi-task workflow
- **WHEN** user runs `designbook workflow create --workflow debo-design-shell --title "Design Shell" --task create-spec "Create spec" scene --task create-component "Create component" component --task create-scene "Create scene" scene`
- **THEN** a `tasks.yml` is created with all three tasks in `pending` status

#### Scenario: Generated name is unique
- **WHEN** `workflow create` is called
- **THEN** the generated name follows the pattern `<workflow-id>-<YYYY-MM-DD>-<4-char-hex>` (e.g., `debo-vision-2026-03-12-a3f7`)

### Requirement: CLI SHALL provide workflow update command
The CLI SHALL provide a `designbook workflow update` command that updates a task's status and handles auto-archiving.

#### Scenario: Update task to in-progress
- **WHEN** user runs `designbook workflow update debo-vision-2026-03-12-a3f7 create-vision --status in-progress`
- **THEN** the task's `status` is set to `in-progress` and `started_at` is set to current ISO 8601 timestamp

#### Scenario: Update task to done
- **WHEN** user runs `designbook workflow update debo-vision-2026-03-12-a3f7 create-vision --status done`
- **THEN** the task's `status` is set to `done` and `completed_at` is set to current ISO 8601 timestamp

#### Scenario: Auto-archive on last task done
- **WHEN** `workflow update` sets the last pending/in-progress task to `done`
- **THEN** the top-level `completed_at` is set and the workflow directory is moved from `workflows/changes/` to `workflows/archive/`

#### Scenario: Invalid task ID
- **WHEN** user runs `workflow update` with a non-existent task ID
- **THEN** the command exits with error code 1 and prints an error message

#### Scenario: Invalid status transition
- **WHEN** user runs `workflow update` on a task already in `done` status
- **THEN** the command exits with error code 1 and prints an error message
