## ADDED Requirements

### Requirement: Structured file declaration in task frontmatter

Task files SHALL declare output files as structured objects with `file`, `key`, and `validators` fields instead of plain path strings.

#### Scenario: Structured file declaration parsed from frontmatter
- **WHEN** a task file contains:
  ```yaml
  files:
    - file: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      key: design-tokens
      validators: [tokens]
  ```
- **THEN** the system parses it as a structured object with `file`, `key`, and `validators` properties

#### Scenario: Key is unique within a task
- **WHEN** two file entries in the same task have the same `key`
- **THEN** `workflow plan` fails with error "Duplicate key '<key>' in task '<task-id>'"

#### Scenario: Key is required
- **WHEN** a file entry has no `key` field
- **THEN** `workflow plan` fails with error indicating `key` is required

#### Scenario: File path supports template substitution
- **WHEN** `file: $DESIGNBOOK_DATA/sections/{{ section_id }}/data.yml` is declared with `params: { section_id: dashboard }`
- **THEN** the path resolves to `$DESIGNBOOK_DATA/sections/dashboard/data.yml` (after env expansion)

#### Scenario: Validators is optional and defaults to empty
- **WHEN** a file entry has no `validators` field
- **THEN** it defaults to `[]` (no validation, auto-pass)

#### Scenario: Empty files array is valid
- **WHEN** a task declares `files: []`
- **THEN** the task produces no output files (intake, preview, test tasks)

### Requirement: Task body uses write-file with key, not raw paths

Task instruction bodies SHALL reference output files exclusively via `designbook workflow write-file ... --key <key>`. Raw file paths SHALL NOT appear in task body instructions.

#### Scenario: Task body contains write-file command
- **WHEN** a task body instructs the AI to produce output
- **THEN** it uses `designbook workflow write-file $WORKFLOW_NAME $TASK_ID --key <key>`
- **AND** the file path is NOT mentioned in the body

#### Scenario: Frontmatter is single source of truth for paths
- **WHEN** an AI agent needs to know where a file will end up
- **THEN** it reads the task's `files` frontmatter, not the body text

### Requirement: TaskFile state derived from validation_result

The `TaskFile` interface in tasks.yml SHALL include `key`, `validators`, and `validation_result`. File state is derived from `validation_result` alone — no separate boolean flags.

#### Scenario: TaskFile stored in tasks.yml after plan (pending state)
- **WHEN** `workflow plan` resolves a task
- **THEN** each file entry in tasks.yml contains:
  ```yaml
  files:
    - path: /abs/resolved/path/design-tokens.yml
      key: design-tokens
      validators: [tokens]
  ```
- **AND** `validation_result` is absent (file not yet written)

#### Scenario: validation_result set after write-file
- **WHEN** `write-file --key design-tokens` succeeds with valid content
- **THEN** the file entry gains `validation_result: { valid: true, last_validated: "..." }`

#### Scenario: File state derived from validation_result
- **WHEN** `validation_result` is absent → file is pending (not yet written)
- **WHEN** `validation_result.valid` is true → file is written and valid
- **WHEN** `validation_result.valid` is false → file is written but has errors
