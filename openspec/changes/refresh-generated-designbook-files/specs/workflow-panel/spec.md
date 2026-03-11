## ADDED Requirements

### Requirement: Workflow progress panel
The Designbook addon panel SHALL display active workflows with their progress. Each workflow SHALL show its title, a progress indicator (completed/total tasks), and workflow status.

#### Scenario: Active workflows displayed
- **WHEN** the user opens the Designbook panel
- **THEN** the panel SHALL fetch data from `/__designbook/workflows`
- **AND** display each active workflow with title and progress (e.g., "Design Shell 2/4")

#### Scenario: No active workflows
- **WHEN** no `tasks.yml` files exist in `designbook/workflows/changes/`
- **THEN** the panel SHALL display an empty state message

### Requirement: Expandable task list
Each workflow in the panel SHALL be expandable to show individual tasks. Tasks SHALL be rendered using the `DeboTaskItem` component.

#### Scenario: User expands workflow
- **WHEN** the user clicks on a workflow entry in the panel
- **THEN** the individual tasks SHALL be displayed with status, title, type, and timestamps

### Requirement: DeboTaskItem UI component
A new `DeboTaskItem` React component SHALL be created in `src/components/ui/`. It SHALL display a status indicator (icon), task title, type badge, and relative timestamps. It SHALL follow existing `Debo*` conventions (DaisyUI classes with `debo:` prefix).

#### Scenario: Task with done status
- **WHEN** `DeboTaskItem` receives a task with `status: done`
- **THEN** it SHALL display a checkmark icon, the title, a type badge, and the relative completion time

#### Scenario: Task with in-progress status
- **WHEN** `DeboTaskItem` receives a task with `status: in-progress`
- **THEN** it SHALL display a spinner/loading icon, the title, and a type badge

#### Scenario: Task with pending status
- **WHEN** `DeboTaskItem` receives a task with `status: pending`
- **THEN** it SHALL display a neutral circle icon and the title

### Requirement: Task completion notifications
When a task status changes to `done`, the panel SHALL trigger a Storybook notification using `api.addNotification()` with the task title and type.

#### Scenario: Task completes
- **WHEN** the panel detects a task status changed from non-done to `done` (via polling delta)
- **THEN** it SHALL call `api.addNotification()` with headline set to the task title and subHeadline set to the workflow title

### Requirement: Panel polling interval
The panel SHALL poll the `/__designbook/workflows` endpoint every 3 seconds when active. Polling SHALL stop when the panel is not visible.

#### Scenario: Panel is active
- **WHEN** the Designbook panel tab is selected
- **THEN** it SHALL poll `/__designbook/workflows` every 3 seconds

#### Scenario: Panel is hidden
- **WHEN** the Designbook panel tab is not selected
- **THEN** it SHALL NOT poll the endpoint
