## ADDED Requirements

### Requirement: workflow done SHALL accept --loaded flag
The `workflow done` command SHALL accept an optional `--loaded <json>` flag carrying stage context and task validation results.

#### Scenario: done with --loaded flag
- **WHEN** the AI calls `workflow done --workflow <name> --task <id> --loaded '<json>'`
- **THEN** the CLI parses the JSON and writes `loaded` to the stage entry and `validation` to the task entry in `tasks.yml`
- **AND** the command exits 0

#### Scenario: done without --loaded flag
- **WHEN** the AI calls `workflow done --workflow <name> --task <id>` without `--loaded`
- **THEN** the CLI sets task status to done as normal
- **AND** no `loaded` or `validation` data is written

#### Scenario: invalid --loaded JSON
- **WHEN** the AI passes malformed JSON to `--loaded`
- **THEN** the CLI exits with error code 1 and prints a descriptive error

### Requirement: loaded data SHALL be stored at stage level, deduplicated
The CLI SHALL write `loaded` (task_file, rules, config_rules, config_instructions) to the stage entry in `tasks.yml`. If `loaded` is already present for that stage, the CLI SHALL ignore the `--loaded` flag's stage-level fields.

#### Scenario: first done for a stage writes loaded
- **WHEN** `workflow done --loaded` is called for the first task of a stage
- **THEN** the stage entry in `tasks.yml` gains a `loaded` block with task_file, rules, config_rules, config_instructions

#### Scenario: subsequent done for same stage does not overwrite
- **WHEN** `workflow done --loaded` is called for a second task in the same stage
- **THEN** the stage `loaded` block is unchanged

### Requirement: validation data SHALL be stored per task
The CLI SHALL write `validation` (array of file/validator/passed entries) from `--loaded` to the individual task entry in `tasks.yml`.

#### Scenario: task with validation results
- **WHEN** `workflow done --loaded '{"validation": [{"file": "/abs/path/x.yml", "validator": "component", "passed": true}]}'` is called
- **THEN** the task entry gains a `validation` array with the provided entries

### Requirement: AI SHALL pass --loaded on every workflow done call
The `designbook-workflow` skill Rule 2 SHALL require the AI to pass `--loaded` on every `workflow done` call, assembling the JSON from:
- `task_file`: absolute path to the matched task file for this stage
- `rules`: array of absolute paths to skill rule files that matched this stage
- `config_rules`: array of strings from `designbook.config.yml` → `workflow.rules.<stage>`
- `config_instructions`: array of strings from `designbook.config.yml` → `workflow.tasks.<stage>`
- `validation`: array of `{file, validator, passed}` objects read from `workflow validate` output

#### Scenario: AI assembles loaded from stage context
- **WHEN** the AI completes a task and calls `workflow done`
- **THEN** `--loaded` SHALL include the task_file path, all rule file paths, all config_rules strings, all config_instructions strings, and the validation results from the preceding `workflow validate` call

#### Scenario: empty arrays for absent data
- **WHEN** no rule files matched the stage and no config entries exist
- **THEN** `rules`, `config_rules`, and `config_instructions` SHALL be empty arrays (not omitted)
