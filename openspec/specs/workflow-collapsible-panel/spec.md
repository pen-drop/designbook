# workflow-collapsible-panel Specification

## Requirements

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

### Requirement: Stage collapsible display
Each stage within an open workflow SHALL render as a nested collapsible `<details>` element with a summary showing stage name and progress badge.

#### Scenario: Stage with active tasks renders open
- **WHEN** a stage has at least one task with status `in-progress` or `pending`
- **THEN** its collapsible SHALL be open by default
- **AND** the summary SHALL show the stage name and progress badge (e.g., `3/4`)

#### Scenario: Completed stage renders closed
- **WHEN** all tasks in a stage have status `done`
- **THEN** its collapsible SHALL be closed by default
- **AND** the left border SHALL be green (`#D0FAE5`)

#### Scenario: Progress badge format
- **WHEN** a stage has 3 of 4 tasks done
- **THEN** the progress badge SHALL display `3/4`

### Requirement: Task activity rows with file badges
Each task within an open stage SHALL render as a flat activity row using the `ManagerActivityItem` dot pattern, followed by inline file badges.

#### Scenario: Done task shows green dot with checkmark
- **WHEN** a task has status `done`
- **THEN** it SHALL render with a green filled dot containing a checkmark and the task title

#### Scenario: Pending task shows empty dot
- **WHEN** a task has status `pending`
- **THEN** it SHALL render with an empty circle dot and the task title

#### Scenario: In-progress task shows status indicator
- **WHEN** a task has status `in-progress`
- **THEN** it SHALL render with a status indicator and the task title

### Requirement: File badges with ContextAction
Each task row SHALL display its files as inline `ManagerBadge` components, each wrapped in `ContextAction`.

#### Scenario: Task with single file
- **WHEN** a task has one file `product-overview.section.scenes.yml`
- **THEN** a badge with the filename SHALL render inline after the task title
- **AND** the badge SHALL have a ⋮ button opening ContextAction with "Copy path" and "Open in editor"

#### Scenario: Task with multiple files
- **WHEN** a task has files `button.component.yml`, `button.twig`, `button.story.yml`
- **THEN** three badges SHALL render inline after the task title, each with its own ⋮ ContextAction

#### Scenario: File badge color reflects validation status
- **WHEN** a file has `validation_result.valid === true`
- **THEN** the badge SHALL use the green variant (`#D0FAE5`)
- **WHEN** a file has `validation_result.valid === false`
- **THEN** the badge SHALL use the yellow variant (`#FEF3C7`)
- **WHEN** a file has no validation result or validation is pending
- **THEN** the badge SHALL use the gray variant (`#F1F5F9`)

#### Scenario: File badge ContextAction shows validation info
- **WHEN** user clicks ⋮ on a file badge with validation data
- **THEN** the context menu SHALL include "Copy path", "Open in editor", and a disabled validation info row showing status, type, and timestamp

### Requirement: Status-colored borders
Collapsible elements SHALL have a left border colored by their status.

#### Scenario: Green border for completed
- **WHEN** a workflow or stage is completed (all tasks done)
- **THEN** its left border SHALL be `#D0FAE5`

#### Scenario: Yellow border for running
- **WHEN** a workflow or stage has active tasks (in-progress)
- **THEN** its left border SHALL be `#FEF3C7`

#### Scenario: Gray border for pending
- **WHEN** a workflow or stage is pending or incomplete
- **THEN** its left border SHALL be `#F1F5F9`

### Requirement: ContextAction on workflow and stage headers
Workflow summary rows SHALL be wrapped in `ContextAction` with the tasks.yml path. Stage summary rows SHALL be wrapped in `ContextAction` with the stage's task_file path.

#### Scenario: Workflow header context action
- **WHEN** user clicks the ellipsis (⋮) on a workflow summary
- **THEN** a context menu appears with "Copy path" and "Open in editor" for the workflow's tasks.yml

#### Scenario: Stage header context action
- **WHEN** user clicks the ellipsis (⋮) on a stage summary
- **THEN** a context menu appears with "Copy path" and "Open in editor" for the stage's task_file
- **AND** extra entries for each rule file in `stage_loaded`

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
