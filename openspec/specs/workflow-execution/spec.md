# workflow-execution Specification

## Purpose
Defines workflow runtime behavior: status lifecycle, step files, tracking convention, task data model, validation gate, loaded tracking, and panel display.

---

## Requirement: Workflow status field

The system SHALL store a `status` field on each workflow with values: `planning`, `running`, or `completed`.

### Scenario: Workflow creation sets planning status
- **WHEN** `designbook-workflow create` runs
- **THEN** tasks.yml contains `status: planning`

### Scenario: Workflow transitions to running
- **WHEN** the first file is registered via `workflow update --files <path>`
- **THEN** status automatically transitions from `planning` to `running`

### Scenario: Workflow transitions to completed
- **WHEN** the last task is set to `done`
- **THEN** status automatically transitions to `completed` and the workflow is moved to `workflows/archive/`

### Scenario: Status updates are atomic
- **WHEN** status changes
- **THEN** the file is written atomically (temp file + rename) to prevent corruption

---

## Requirement: Step files encapsulate CLI commands

The `designbook-workflow` skill provides four step files that workflows load by reference:

- `steps/create.md` — `workflow create` command, captures `$WORKFLOW_NAME`
- `steps/update.md` — `workflow update --status in-progress|done`
- `steps/add-files.md` — `workflow update --files <paths>` (must be called before `validate`, not on done)
- `steps/validate.md` — `workflow validate $WORKFLOW_NAME`, interpret JSON output, run fix loop

### Scenario: Files registered before validation
- **WHEN** an agent reads `add-files.md`
- **THEN** it understands that `--files` must be passed on an `--status in-progress` update, never on done

### Scenario: Fix loop runs until exit 0
- **WHEN** `workflow validate` returns exit code != 0
- **THEN** the step instructs the agent to fix errors and re-run until all pass

---

## Requirement: Every debo workflow SHALL track progress via CLI

Every `debo-*` workflow SHALL call `workflow create` at start and `workflow update` after each step.

Applicable workflows: debo-vision, debo-sections, debo-shape-section, debo-design-tokens, debo-css-generate, debo-data-model, debo-sample-data, debo-design-shell, debo-design-component, debo-design-screen, debo-screenshot-design, debo-export-product.

### Scenario: Spec mode creates tasks but does not execute
- **WHEN** a workflow is invoked with `--spec`
- **THEN** `workflow create` runs (generating tasks.yml), the plan is output, and execution stops

### Scenario: Normal mode plans via CLI then executes via subagents
- **WHEN** a workflow runs without `--spec`
- **THEN** the AI calls `workflow plan` with `--workflow-file`, `--params`, and `--items`; the CLI resolves everything; then the AI starts DAG execution with subagents

---

## Requirement: WorkflowTask data model

Each task in tasks.yml stores files produced and validation state:

```yaml
tasks:
  - id: create-button
    title: Create Button Component
    type: component
    status: done
    stage: create-component
    files:
      - ../components/button/button.component.yml
      - ../components/button/button.default.story.yml
    validation_status: failed
    last_validated: "2026-03-16T14:22:01Z"
    last_failed: "2026-03-16T14:22:01Z"
    validation_results:
      - { file: "../components/button/button.component.yml", type: component, valid: true }
      - { file: "../components/button/button.default.story.yml", type: story, valid: false,
          error: "button.twig:5: Variable 'label' is not defined" }
```

### Scenario: Files persisted on task update
- **WHEN** `workflow update --status in-progress --files [...]` is called
- **THEN** `files[]` is stored on the task and `validation_status` is set to `pending`

### Scenario: Timestamps updated on validate
- **WHEN** `workflow validate` runs
- **THEN** `last_validated` is set; `last_passed` is set if all pass, `last_failed` if any fail

---

## Requirement: workflow validate validates all workflow files

`workflow validate <name>` validates all files registered across all tasks, updates results in tasks.yml, and outputs one JSON line per file.

### Scenario: All files pass
- **WHEN** all registered files validate
- **THEN** output is `{ task, file, type, valid: true }` per file, exit code 0

### Scenario: Story file fails
- **WHEN** a `.story.yml` file fails to render
- **THEN** output includes `{ task, file, type: "story", valid: false, error: "<message>" }`, exit code 1

### Scenario: Storybook not running
- **WHEN** Storybook is not reachable
- **THEN** story files output `{ type: "story", valid: null, skipped: true, reason: "Storybook not running" }`, exit code 0

---

## Requirement: Validation is a hard gate before task completion

After a file is registered, validation MUST pass (exit 0) before the task can be marked done.

### Scenario: Task cannot be marked done with failing validation
- **WHEN** a task attempts `--status done` but registered files have `valid: false`
- **THEN** the CLI rejects the update with an error listing failures

### Scenario: AI must fix errors before continuing
- **WHEN** `workflow validate` returns exit code != 0
- **THEN** the AI MUST fix the errors, re-run validate, repeat until exit 0

### Scenario: All files valid allows done
- **WHEN** `workflow validate` returns exit code 0
- **THEN** `workflow update --status done` is allowed

---

## Requirement: workflow done accepts --loaded flag

`workflow done` SHALL accept an optional `--loaded <json>` flag carrying stage context and validation results.

The JSON shape:
```json
{
  "task_file": "/abs/path/to/tasks/create-component.md",
  "rules": ["/abs/path/to/rules/drupal-field-naming.md"],
  "config_rules": ["string from config.workflow.rules.<stage>"],
  "config_instructions": ["string from config.workflow.tasks.<stage>"],
  "validation": [{ "file": "/abs/path/x.yml", "validator": "component", "passed": true }]
}
```

### Scenario: Stage-level loaded written once, not overwritten
- **WHEN** `workflow done --loaded` is called for the first task of a stage
- **THEN** the stage entry gains a `loaded` block
- **WHEN** called for a second task in the same stage
- **THEN** the stage `loaded` block is unchanged

### Scenario: AI passes --loaded on every done call
- **WHEN** the AI completes a task
- **THEN** `--loaded` includes task_file path, all rule file paths, all config_rules/config_instructions strings, and validation results from the preceding `workflow validate` call

### Scenario: Empty arrays for absent data
- **WHEN** no rule files matched and no config entries exist
- **THEN** `rules`, `config_rules`, `config_instructions` are empty arrays (not omitted)

---

## Requirement: Panel displays workflow status with three-state icons

The Storybook panel's Workflows tab SHALL display a visual icon per workflow:
- 📋 `planning`
- ⚡ `running`
- ✅ `completed`

### Scenario: Panel reads status from API
- **WHEN** `/__designbook/workflows` returns workflow data
- **THEN** each workflow object includes `status: 'planning' | 'running' | 'completed'`

### Scenario: Panel updates on status change
- **WHEN** a workflow's status changes
- **THEN** the panel updates within 3 seconds (via SSE/polling)

### Scenario: Panel shows task files and validation
- **WHEN** a task has `files[]` set
- **THEN** the panel shows file paths with validation badge: ✅ passed / ❌ failed / ⏭ skipped / ⏳ pending
- **WHEN** a file has `valid: false`
- **THEN** the panel shows the `error` message inline below the file path

---

## Requirement: Rule 3 Phase 2 delegates to workflow plan CLI

After intake, the AI SHALL delegate task resolution to the CLI instead of performing manual skill scanning.

### Scenario: AI builds items array from intake
- **WHEN** intake is complete
- **THEN** the AI builds an items JSON array with one entry per task (stage + params) based on intake results, including loop expansion (e.g. 3 components → 3 items with stage `create-component`)

### Scenario: AI calls workflow plan with workflow-file
- **WHEN** items are ready
- **THEN** the AI calls `$DESIGNBOOK_CMD workflow plan --workflow $WORKFLOW_NAME --workflow-file <path> --params '<global>' --items '<items>'`

### Scenario: CLI returns resolved plan
- **WHEN** `workflow plan` completes
- **THEN** the AI reads the JSON output to display the plan summary (task count, stages, dependencies)

---

## Requirement: Rule 5d — DAG-based parallel subagent dispatch

After the plan phase, the main agent SHALL enter a DAG orchestration loop replacing in-process sequential execution.

### Scenario: Orchestrator computes ready set each wave
- **WHEN** the DAG loop starts or a wave completes
- **THEN** the orchestrator computes `ready = tasks where status != done AND all depends_on IDs have status done`

### Scenario: In-process execution no longer used
- **WHEN** Rule 5d is active (normal workflow execution, not --spec)
- **THEN** Rule 5c (in-process stage execution) is NOT applied by the main agent — only subagents apply 5c

### Scenario: Rule 5c applies inside each subagent
- **WHEN** a subagent is spawned for a task
- **THEN** the subagent applies Rules 0 and 5c for its assigned task ID only — Rule 5b is replaced by reading pre-resolved `task.rules[]`

---

## Requirement: File locking for concurrent tasks.yml access

All CLI commands that modify tasks.yml SHALL acquire a file lock before read-modify-write operations.

### Scenario: Parallel validate calls do not corrupt data
- **WHEN** two subagents call `workflow validate` simultaneously
- **THEN** each acquires the lock, reads current state, writes its changes, releases the lock — no data loss

### Scenario: Lock contention is resolved by retry
- **WHEN** a CLI command cannot acquire the lock
- **THEN** it retries with exponential backoff (up to 5 seconds) before failing with an error
