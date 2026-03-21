## MODIFIED Requirements

### Requirement: Task file format
The system SHALL use YAML files at `designbook/workflows/changes/[change-name]/tasks.yml` to track workflow progress. Each file SHALL contain a `title`, `workflow`, `status`, `stages`, `started_at`, `completed_at`, and a `tasks` array. Each task SHALL have `id`, `title`, `type`, `stage`, `status`, `started_at`, `completed_at`, `files`, and an optional `validation` array. Each stage entry SHALL have a `name` field and an optional `loaded` block.

#### Scenario: Valid task file structure
- **WHEN** a workflow creates a task file
- **THEN** the file SHALL contain all required top-level fields (`title`, `workflow`, `status`, `stages`, `started_at`, `tasks`)
- **AND** each task SHALL have `id` (string), `title` (string), `type` (string), `stage` (string), `status` (one of `pending`, `in-progress`, `done`, `incomplete`), `started_at` (ISO 8601 or null), `completed_at` (ISO 8601 or null), `files` (array)
- **AND** each stage entry SHALL have `name` (string) and optional `loaded` block

#### Scenario: Stage loaded block structure
- **WHEN** `workflow done --loaded` is called for a stage
- **THEN** the stage entry SHALL gain a `loaded` block with the following fields:
  - `task_file` (string, absolute path)
  - `rules` (array of strings, absolute paths)
  - `config_rules` (array of strings)
  - `config_instructions` (array of strings)

#### Scenario: Task validation array
- **WHEN** `workflow done --loaded` includes a `validation` key
- **THEN** the task entry SHALL gain a `validation` array where each entry has:
  - `file` (string, absolute path)
  - `validator` (string, e.g. `component`, `scene`, `tokens`, `data`, `twig`)
  - `passed` (boolean)

#### Scenario: Backwards compatibility
- **WHEN** a tasks.yml exists without `loaded` or `validation` fields
- **THEN** the CLI SHALL read and process it without error
- **AND** missing fields SHALL be treated as absent (not as errors)
