## MODIFIED Requirements

### Requirement: Every debo workflow SHALL track progress via CLI

Every `debo-*` workflow SHALL call `workflow create` at start and `workflow update` after each step.

Applicable workflows: debo-vision, debo-sections, debo-shape-section, debo-design-tokens, debo-css-generate, debo-data-model, debo-sample-data, debo-design-shell, debo-design-component, debo-design-screen, debo-screenshot-design, debo-export-product.

#### Scenario: Spec mode creates tasks but does not execute
- **WHEN** a workflow is invoked with `--spec`
- **THEN** `workflow create` runs (generating tasks.yml), the plan is output, and execution stops

#### Scenario: Normal mode plans via CLI then executes via subagents
- **WHEN** a workflow runs without `--spec`
- **THEN** the AI calls `workflow plan` with `--workflow-file`, `--params`, and `--items`; the CLI resolves everything; then the AI starts DAG execution with subagents

## ADDED Requirements

### Requirement: Rule 3 Phase 2 delegates to workflow plan CLI

After intake, the AI SHALL delegate task resolution to the CLI instead of performing manual skill scanning.

#### Scenario: AI builds items array from intake
- **WHEN** intake is complete
- **THEN** the AI builds an items JSON array with one entry per task (stage + params) based on intake results, including loop expansion (e.g. 3 components → 3 items with stage `create-component`)

#### Scenario: AI calls workflow plan with workflow-file
- **WHEN** items are ready
- **THEN** the AI calls `$DESIGNBOOK_CMD workflow plan --workflow $WORKFLOW_NAME --workflow-file <path> --params '<global>' --items '<items>'`

#### Scenario: CLI returns resolved plan
- **WHEN** `workflow plan` completes
- **THEN** the AI reads the JSON output to display the plan summary (task count, stages, dependencies)

### Requirement: Rule 5d — DAG-based parallel subagent dispatch

After the plan phase, the main agent SHALL enter a DAG orchestration loop replacing in-process sequential execution.

#### Scenario: Orchestrator computes ready set each wave
- **WHEN** the DAG loop starts or a wave completes
- **THEN** the orchestrator computes `ready = tasks where status != done AND all depends_on IDs have status done`

#### Scenario: In-process execution no longer used
- **WHEN** Rule 5d is active (normal workflow execution, not --spec)
- **THEN** Rule 5c (in-process stage execution) is NOT applied by the main agent — only subagents apply 5c

#### Scenario: Rule 5c applies inside each subagent
- **WHEN** a subagent is spawned for a task
- **THEN** the subagent applies Rules 0 and 5c for its assigned task ID only — Rule 5b is replaced by reading pre-resolved `task.rules[]`

### Requirement: File locking for concurrent tasks.yml access

All CLI commands that modify tasks.yml SHALL acquire a file lock before read-modify-write operations.

#### Scenario: Parallel validate calls do not corrupt data
- **WHEN** two subagents call `workflow validate` simultaneously
- **THEN** each acquires the lock, reads current state, writes its changes, releases the lock — no data loss

#### Scenario: Lock contention is resolved by retry
- **WHEN** a CLI command cannot acquire the lock
- **THEN** it retries with exponential backoff (up to 5 seconds) before failing with an error
