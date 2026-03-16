# workflow-panel Specification

## Purpose
TBD - created by archiving change refresh-generated-designbook-files. Update Purpose after archive.
## Requirements
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
Each workflow in the panel SHALL be expandable to show individual tasks. Tasks SHALL be rendered using the `DeboActionList` component.

#### Scenario: User expands workflow
- **WHEN** the user clicks on a workflow entry in the panel
- **THEN** the individual tasks SHALL be displayed with status icon, title, type badge, and timestamps

### Requirement: DeboActionList component library
A set of React components SHALL be created in `src/components/ui/` that mirrors the API of Storybook's internal `ActionList` (from `storybook/internal/components`). The components SHALL be copied and adapted from Storybook's source as a reference implementation, using `debo:` prefixed Tailwind/DaisyUI classes instead of Storybook's styled-components. This avoids dependency on Storybook internals that may break on updates.

The component set SHALL include:
- `DeboActionList` — list container
- `DeboActionList.Item` — single task row with icon, label, and optional trailing content
- `DeboActionList.Icon` — status icon slot (left side)
- `DeboActionList.Text` — label slot

Type badges SHALL use the existing `DeboBadge` component — no new badge component needed.

#### Scenario: ActionList renders task items
- **WHEN** `DeboActionList` receives an array of task items
- **THEN** it SHALL render each as a compact single-line row with icon, label, and optional badge

#### Scenario: Task with done status
- **WHEN** an item has `status: done`
- **THEN** the icon slot SHALL display a green checkmark
- **AND** the label SHALL use a success/positive color

#### Scenario: Task with in-progress status
- **WHEN** an item has `status: in-progress`
- **THEN** the icon slot SHALL display a spinner or animated indicator

#### Scenario: Task with pending status
- **WHEN** an item has `status: pending`
- **THEN** the icon slot SHALL display a neutral circle
- **AND** the label SHALL use a muted color

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

