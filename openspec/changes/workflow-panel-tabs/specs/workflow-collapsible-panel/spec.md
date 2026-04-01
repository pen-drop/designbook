## MODIFIED Requirements

### Requirement: Workflow collapsible display
The Workflows tab SHALL render each workflow as a collapsible `<details>` element with a summary showing status icon, workflow title, progress count, and time range. The collapsible body SHALL contain a tabbed view instead of nested stage/step/task collapsibles.

#### Scenario: Running workflow renders open
- **WHEN** a workflow has `status: running`
- **THEN** its collapsible SHALL be open by default
- **AND** the summary SHALL show the status icon, workflow title, progress count (e.g., `5/12`), and start timestamp
- **AND** the body SHALL contain a tabbed view with Summary, Tasks, and Context tabs

#### Scenario: Completed workflow renders closed
- **WHEN** a workflow has `status: completed`
- **THEN** its collapsible SHALL be closed by default
- **AND** the left border SHALL be green (`#D0FAE5`)

#### Scenario: Planning workflow renders open
- **WHEN** a workflow has `status: planning`
- **THEN** its collapsible SHALL be open by default

#### Scenario: Incomplete workflow renders closed
- **WHEN** a workflow has `status: incomplete`
- **THEN** its collapsible SHALL be closed by default

## REMOVED Requirements

### Requirement: Stage collapsible display
**Reason**: Replaced by the Tasks tab which renders stages as flat visual dividers, not collapsibles.
**Migration**: Stage information is now shown as header rows in the Tasks tab. Stage progress counts remain visible.

### Requirement: Task activity rows with file badges
**Reason**: Replaced by the Tasks tab flat list with status-colored row backgrounds. File badges move to the Summary tab's current task view.
**Migration**: Task rows in the Tasks tab show status dot, title, and duration. File details are visible in the Summary tab's current task collapsible.
