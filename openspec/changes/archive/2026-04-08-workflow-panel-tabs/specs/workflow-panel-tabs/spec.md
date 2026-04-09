## ADDED Requirements

### Requirement: Workflow tabbed view
Each workflow collapsible SHALL contain a tab bar with three tabs: Summary, Tasks, Context. The Summary tab SHALL be selected by default.

#### Scenario: Tabs render inside workflow collapsible
- **WHEN** a workflow collapsible is expanded
- **THEN** a tab bar with "Summary", "Tasks", "Context" SHALL render inside the collapsible body
- **AND** the Summary tab SHALL be active by default

#### Scenario: Tab switching preserves workflow state
- **WHEN** user switches from Summary to Tasks tab
- **THEN** the Tasks tab content SHALL render immediately
- **AND** switching back to Summary SHALL preserve the previous state

### Requirement: Summary tab content
The Summary tab SHALL display a minimal progress overview with the currently running task.

#### Scenario: Running workflow summary
- **WHEN** a workflow has status `running` with 5 of 12 tasks done
- **THEN** the Summary tab SHALL show a status dot, a progress bar, and the text `5/12`
- **AND** it SHALL show "Started: <time>" and "Duration: <elapsed>"

#### Scenario: Summary text display
- **WHEN** a workflow has a non-empty `summary` field
- **THEN** the summary text SHALL render below the progress bar

#### Scenario: No summary text
- **WHEN** a workflow has no `summary` field or it is empty
- **THEN** no summary text section SHALL render

#### Scenario: Current task displayed expanded
- **WHEN** a workflow has a task with status `in-progress`
- **THEN** the Summary tab SHALL show that task in a collapsible that is open by default
- **AND** the task SHALL display its title, stage, step, running duration, and associated files

#### Scenario: No running task
- **WHEN** no task has status `in-progress`
- **THEN** the current task section SHALL not render

### Requirement: Tasks tab flat list
The Tasks tab SHALL render all tasks as a flat list grouped only by stage headers.

#### Scenario: Stage header rendering
- **WHEN** a workflow has stages `intake`, `execute`, `test`
- **THEN** the Tasks tab SHALL render three stage headers as visual dividers
- **AND** each header SHALL show the stage name and a progress count (e.g., `2/2`, `3/7`, `pending`)

#### Scenario: Tasks listed under stage
- **WHEN** stage `execute` contains tasks `create-data-model`, `create-tokens`, `generate-jsonata`
- **THEN** those tasks SHALL render as flat rows directly below the `execute` stage header
- **AND** tasks SHALL appear in their original order from `WorkflowData.tasks`

#### Scenario: No step-level grouping
- **WHEN** tasks within a stage belong to different steps
- **THEN** no step-level headers or grouping SHALL be rendered

### Requirement: Task row status backgrounds
Each task row in the Tasks tab SHALL have a background color reflecting its status.

#### Scenario: Done task row
- **WHEN** a task has status `done`
- **THEN** the row SHALL have a green background (`rgba(34, 197, 94, 0.08)`)
- **AND** it SHALL show a green status dot, the task title, and the duration (e.g., `12s`)

#### Scenario: Running task row
- **WHEN** a task has status `in-progress`
- **THEN** the row SHALL have an amber background (`rgba(245, 158, 11, 0.10)`)
- **AND** it SHALL show an amber status dot, the task title, and "running · <elapsed>"

#### Scenario: Pending task row
- **WHEN** a task has status `pending`
- **THEN** the row SHALL have a transparent background
- **AND** it SHALL show a neutral status dot and the task title

### Requirement: Context tab with step filter
The Context tab SHALL display all loaded context files in a filterable table with multi-select step filter badges.

#### Scenario: Step filter badges render
- **WHEN** the Context tab is active and the workflow has steps `intake--data-model`, `create-tokens`, `map-entity`
- **THEN** a row of toggle badges SHALL render for each step

#### Scenario: No filter shows all context
- **WHEN** no step filter badges are selected
- **THEN** the table SHALL display all context files from all steps

#### Scenario: Multi-select filter
- **WHEN** user selects badges for `create-tokens` and `map-entity`
- **THEN** the table SHALL display only context files loaded by those two steps

#### Scenario: Context table columns
- **WHEN** context files are displayed
- **THEN** the table SHALL have columns: Type, Name, Step
- **AND** Type SHALL show a label indicating `blueprint`, `rule`, `task`, or `config`

#### Scenario: Full path on hover
- **WHEN** user hovers over a context table row
- **THEN** a tooltip SHALL display the full file path
