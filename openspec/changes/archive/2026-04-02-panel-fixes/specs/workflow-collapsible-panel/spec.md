## MODIFIED Requirements

### Requirement: Workflow collapsible display
The Workflows tab SHALL render each workflow as a collapsible `<details>` element with a summary showing status icon, workflow title, and time range. Inside each workflow, sub-tabs (Summary, Tasks, Context, Files) SHALL persist their selected state via URL query parameter `debo-wf-tab`, surviving Storybook reloads.

#### Scenario: Running workflow renders open
- **WHEN** a workflow has `status: running`
- **THEN** its collapsible SHALL be open by default
- **AND** the summary SHALL show the status icon, workflow title, and start timestamp

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

#### Scenario: Sub-tab selection persists across reload
- **WHEN** user selects a sub-tab (e.g., Tasks) and Storybook reloads
- **THEN** the same sub-tab SHALL be selected after reload

#### Scenario: Active sub-tab has white text and green border
- **WHEN** a sub-tab is selected
- **THEN** its button text SHALL be white (#FFFFFF) and bottom border SHALL be green (#66BF3C)

## ADDED Requirements

### Requirement: Summary tab shows end time
The Summary tab SHALL display a "Completed" timestamp alongside "Started" and "Duration" when the workflow has a `completed_at` value.

#### Scenario: Running workflow shows no end time
- **WHEN** a workflow has no `completed_at`
- **THEN** only "Started" and "Duration" SHALL be displayed

#### Scenario: Completed workflow shows end time
- **WHEN** a workflow has `completed_at` set
- **THEN** "Completed: HH:MM" SHALL be displayed alongside "Started" and "Duration"

### Requirement: Active task collapsible shows context and files
The Summary tab's active task collapsible SHALL display the task's loaded context (task_file, rules, blueprints, config_rules, config_instructions) and its files with status badges.

#### Scenario: Active task shows loaded context
- **WHEN** the active task has `task_file`, `rules[]`, `blueprints[]`, `config_rules[]`, or `config_instructions[]`
- **THEN** a "Context" section SHALL list each item with its type and shortened path

#### Scenario: Active task shows files
- **WHEN** the active task has `files[]`
- **THEN** a "Files" section SHALL show file badges with validation-based coloring

### Requirement: Context tab column order is Name then Type
The Context tab table SHALL display columns in the order: Name, Type, Step.

#### Scenario: Context table header order
- **WHEN** the Context tab renders
- **THEN** the table headers SHALL be ordered: Name, Type, Step

### Requirement: Tasks tab shows intake tasks
The Tasks tab SHALL display intake tasks alongside all other tasks, not filter them out.

#### Scenario: Workflow with intake task
- **WHEN** a workflow has an intake task (stage: intake)
- **THEN** the Tasks tab SHALL display it in the task list with its status and files
