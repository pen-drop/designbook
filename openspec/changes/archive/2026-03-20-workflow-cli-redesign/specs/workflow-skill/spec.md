## MODIFIED Requirements

### Requirement: Workflow skill uses plan-then-execute pattern
The workflow skill SHALL enforce a plan-then-execute pattern: all tasks and their expected files are declared before any file is created. The `!WORKFLOW_PLAN` marker is the gate — no file creation happens before it completes.

#### Scenario: Plan gate enforced
- **WHEN** a debo-* workflow begins
- **THEN** the AI SHALL NOT create any files before `workflow create --tasks <json>` has been called
- **AND** the `!WORKFLOW_PLAN` marker explicitly signals when planning is complete and execution may begin

#### Scenario: Execution after plan
- **WHEN** `workflow create` has completed and `$WORKFLOW_NAME` is set
- **THEN** for each `!TASK` / `!TASK_END` block: create declared files → `workflow validate --task` → `workflow done --task`

### Requirement: Rule 0 — Resume check
Before creating a new workflow, the AI SHALL check for existing unarchived workflows.

#### Scenario: Unarchived workflow exists
- **WHEN** a debo-* workflow begins
- **THEN** the AI SHALL run `workflow list --workflow <id>`
- **AND** if results are returned, ask the user to continue or start fresh
- **AND** if continuing, use the existing workflow name as `$WORKFLOW_NAME` and skip to the first pending task

#### Scenario: No existing workflow
- **WHEN** `workflow list` returns nothing
- **THEN** the AI SHALL proceed to the `!WORKFLOW_PLAN` marker

### Requirement: Rule 0.5 — Standalone skill check
When a skill is invoked without a parent workflow, the AI SHALL ask the user if they want workflow tracking.

#### Scenario: Skill called without $WORKFLOW_NAME
- **WHEN** `$WORKFLOW_NAME` is not set
- **THEN** the AI SHALL ask: "Do you want to track this as a workflow?"
- **AND** if yes, proceed with the `!WORKFLOW_PLAN` rule
- **AND** if no, skip all marker processing

### Requirement: Rule 1 — Workflow plan (!WORKFLOW_PLAN)
The `!WORKFLOW_PLAN` marker triggers the AI to gather all context needed for the complete task plan and call `workflow create` with the full JSON.

#### Scenario: Plan built from workflow context
- **WHEN** the AI reaches `!WORKFLOW_PLAN`
- **THEN** it SHALL gather all necessary context (reading files, completing any user dialog to determine component names, counts, etc.)
- **AND** build a JSON array with all tasks including their `id`, `title`, `type`, and `files` arrays
- **AND** call `workflow create --workflow <id> --title "<title>" --tasks '<json>'` (or `--tasks-file <path>` for long plans)
- **AND** capture the output as `$WORKFLOW_NAME`
- **AND** only then allow file creation to begin

#### Scenario: Plan includes all known files
- **WHEN** the AI builds the plan JSON
- **THEN** each task's `files` array SHALL contain all file paths that will be created for that task
- **AND** file paths SHALL be relative to `$DESIGNBOOK_DIST`

#### Scenario: Loop tasks (one task per component)
- **WHEN** a workflow creates N components
- **THEN** the plan JSON SHALL contain N task entries, one per component, each with its own file list
- **AND** all N tasks are declared in the single `workflow create` call

### Requirement: Rule 2 — Task execution (!TASK / !TASK_END)
For each `!TASK` / `!TASK_END` block, the AI creates the declared files then validates and marks the task done.

#### Scenario: Execute a task block
- **WHEN** the AI reaches `!TASK <id>`
- **THEN** it SHALL create all files declared for `<id>` in the plan
- **AND** when `!TASK_END <id>` is reached, run `workflow validate --workflow $WORKFLOW_NAME --task <id>`
- **AND** if validation fails, fix errors and re-validate until exit 0
- **AND** run `workflow done --workflow $WORKFLOW_NAME --task <id>`

#### Scenario: Undeclared file added mid-task
- **WHEN** a file not in the original plan needs to be created during task execution
- **THEN** the AI SHALL call `workflow add-file --workflow $WORKFLOW_NAME --task <id> --file <path>` before validate

### Requirement: Rule 3 — Workflow done (!WORKFLOW_DONE)
When `!WORKFLOW_DONE` is reached, all tasks must be done (CLI auto-archives on last `workflow done` call).

#### Scenario: All tasks done
- **WHEN** `!WORKFLOW_DONE` is reached
- **THEN** the AI SHALL verify that `$WORKFLOW_NAME` has been archived (i.e. the last `workflow done` call already triggered archival)

### Requirement: Idempotent workflow creation (resume)
When resuming, the AI uses the existing `$WORKFLOW_NAME` and skips tasks already in `done` status.

#### Scenario: Resume skips completed tasks
- **WHEN** the AI resumes an existing workflow
- **THEN** it SHALL skip all tasks with `status: done`
- **AND** continue from the first task with `status: pending` or `in-progress`
