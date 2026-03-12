## ADDED Requirements

### Requirement: Every debo workflow SHALL track progress via CLI commands
Every user-facing `debo-*` workflow in `.agent/workflows/` SHALL use `designbook workflow create` at start and `designbook workflow update` after each step. The applicable workflows are: debo-vision, debo-sections, debo-shape-section, debo-design-tokens, debo-css-generate, debo-data-model, debo-sample-data, debo-design-shell, debo-design-component, debo-design-screen, debo-screenshot-design, debo-export-product.

#### Scenario: Single-task workflow creates tracking
- **WHEN** user runs `/debo-vision`
- **THEN** the workflow calls `designbook workflow create` and receives a unique workflow name
- **AND** a `tasks.yml` is created with one task in `pending` status before the actual work begins

#### Scenario: Multi-task workflow creates tracking
- **WHEN** user runs `/debo-design-shell`
- **THEN** the workflow calls `designbook workflow create` with multiple `--task` flags
- **AND** a `tasks.yml` is created with all planned tasks in `pending` status

### Requirement: Workflows SHALL update task status during execution
Each workflow step that produces a file output SHALL call `designbook workflow update` to set its corresponding task to `done` after completing.

#### Scenario: Task completion triggers update
- **WHEN** a workflow step completes successfully
- **THEN** the workflow calls `designbook workflow update <name> <task-id> --status done`

### Requirement: Spec mode SHALL show plan with tasks and stop
When a workflow is invoked with `--spec`, it SHALL run `designbook workflow create` to generate the tasks.yml, output the plan, and stop without executing.

#### Scenario: Spec mode creates tasks but does not execute
- **WHEN** user runs `/debo-vision --spec`
- **THEN** the workflow creates the tasks.yml, outputs the plan including all tasks, and stops

### Requirement: Workflow tracking section SHALL follow standard format
Each workflow file SHALL include a `## Workflow Tracking` section with the `create` and `update` CLI calls for its specific tasks.

#### Scenario: Workflow file contains tracking section
- **WHEN** a `debo-*.md` workflow file is inspected
- **THEN** it contains a `## Workflow Tracking` section with `designbook workflow create` and `designbook workflow update` commands
