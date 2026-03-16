# workflow-tasks Specification

## Purpose
TBD - created by archiving change refresh-generated-designbook-files. Update Purpose after archive.
## Requirements
### Requirement: Task file format
The system SHALL use YAML files at `designbook/workflows/changes/[change-name]/tasks.yml` to track workflow progress. Each file SHALL contain a `title`, `workflow`, `started_at`, `completed_at`, and a `tasks` array. Each task SHALL have `id`, `title`, `type`, `status`, `started_at`, and `completed_at` fields.

#### Scenario: Valid task file structure
- **WHEN** a workflow creates a task file
- **THEN** the file SHALL contain all required top-level fields (`title`, `workflow`, `started_at`, `tasks`)
- **AND** each task SHALL have `id` (string), `title` (string), `type` (string), `status` (one of `pending`, `in-progress`, `done`), `started_at` (ISO 8601 or null), `completed_at` (ISO 8601 or null)

### Requirement: Task type values
The `type` field on each task SHALL be one of: `component`, `scene`, `data`, `tokens`, `view-mode`, `css`, `validation`. The type determines the semantic meaning of the task for UI display and future refresh strategy.

#### Scenario: Known task types
- **WHEN** a task is created with a `type` value
- **THEN** the value SHALL be one of the defined types

### Requirement: Workflow lifecycle directories
Active workflows SHALL be stored in `designbook/workflows/changes/`. Completed workflows SHALL be moved to `designbook/workflows/archive/`. The directory name SHALL match the workflow change name in kebab-case.

#### Scenario: Workflow starts
- **WHEN** a workflow creates a new `tasks.yml` in `designbook/workflows/changes/[name]/`
- **THEN** the directory SHALL be created if it does not exist
- **AND** `started_at` SHALL be set to the current ISO 8601 timestamp

#### Scenario: Workflow completes
- **WHEN** all tasks in a `tasks.yml` have `status: done`
- **THEN** `completed_at` on the top-level SHALL be set to the current timestamp
- **AND** the entire `designbook/workflows/changes/[name]/` directory SHALL be moved to `designbook/workflows/archive/[name]/`

### Requirement: Vite plugin watches workflow changes
The Vite plugin SHALL watch `designbook/workflows/changes/` for file changes. When a new `tasks.yml` is created, the plugin SHALL trigger a full Storybook reload. When a `tasks.yml` is updated and all tasks are `done`, the plugin SHALL trigger a full Storybook reload.

#### Scenario: New workflow detected
- **WHEN** a new `tasks.yml` file appears in `designbook/workflows/changes/`
- **THEN** the Vite plugin SHALL trigger a full Storybook reload

#### Scenario: Workflow completion detected
- **WHEN** a `tasks.yml` file is updated and all tasks have `status: done`
- **THEN** the Vite plugin SHALL trigger a full Storybook reload

#### Scenario: Individual task update
- **WHEN** a `tasks.yml` file is updated but not all tasks are `done`
- **THEN** the Vite plugin SHALL NOT trigger a reload

### Requirement: HTTP endpoint for workflow data
The Vite plugin SHALL serve workflow data at `/__designbook/workflows`. The endpoint SHALL return a JSON array of all active workflow task files from `designbook/workflows/changes/`.

#### Scenario: Panel requests workflow data
- **WHEN** the Storybook panel fetches `/__designbook/workflows`
- **THEN** the response SHALL be a JSON array of parsed `tasks.yml` contents
- **AND** each entry SHALL include the `changeName` derived from the directory name

