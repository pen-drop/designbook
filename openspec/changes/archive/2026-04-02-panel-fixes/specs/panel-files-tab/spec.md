## ADDED Requirements

### Requirement: Files sub-tab displays all workflow files with status coloring
The workflow panel SHALL include a "Files" sub-tab alongside Summary, Tasks, and Context. It SHALL collect all files from all tasks in the workflow and display them as a flat list with three-state coloring.

#### Scenario: File with no validation result shows white
- **WHEN** a file has no `validation_result`
- **THEN** the file row SHALL use a neutral/white style indicating pending status

#### Scenario: File with validation result but not valid shows orange
- **WHEN** a file has `validation_result` present but `valid !== true`
- **THEN** the file row SHALL use an orange style indicating modified/written status

#### Scenario: File with valid validation shows green
- **WHEN** a file has `validation_result.valid === true`
- **THEN** the file row SHALL use a green style indicating flushed/validated status

#### Scenario: Files tab shows shortened paths
- **WHEN** files are displayed
- **THEN** each file SHALL show a shortened path via `shortenPath()` and optionally the file key as a label

### Requirement: Files tab supports task-based filtering
The Files sub-tab SHALL provide filter badges for each task, allowing users to view files for specific tasks only.

#### Scenario: All files shown when no filter active
- **WHEN** no task filter badge is selected
- **THEN** all files from all tasks SHALL be displayed

#### Scenario: Filtering by task shows only that task's files
- **WHEN** user clicks a task filter badge
- **THEN** only files belonging to that task SHALL be displayed

#### Scenario: Multiple task filters can be active
- **WHEN** user clicks multiple task filter badges
- **THEN** files from all selected tasks SHALL be displayed

#### Scenario: Toggling a filter badge deselects it
- **WHEN** user clicks an already-active task filter badge
- **THEN** the filter is removed and files from all tasks are shown again (unless other filters remain)
