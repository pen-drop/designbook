## ADDED Requirements

### Requirement: Task files declare input dependencies via `reads:`
Task files SHALL support an optional `reads:` frontmatter field listing files required before the task executes. Each entry SHALL have a `path` (using `$DESIGNBOOK_DIST` or `$DESIGNBOOK_DRUPAL_THEME` prefix) and a `workflow` (the debo-* workflow that generates the file).

#### Scenario: reads: field structure
- **WHEN** a task file requires a previously generated file
- **THEN** the frontmatter contains a `reads:` list with `path` and `workflow` per entry

#### Scenario: reads: omitted when no dependencies
- **WHEN** a task has no file dependencies
- **THEN** the `reads:` field is omitted entirely from frontmatter

### Requirement: AI checks reads: files before executing a task
Before executing any task stage, the AI SHALL verify that every file listed in `reads:` exists. If any file is missing, the AI SHALL stop immediately and report which workflow to run.

#### Scenario: missing reads: file
- **WHEN** a task has `reads:` and a listed file does not exist at `$DESIGNBOOK_DIST`
- **THEN** the AI stops, does not attempt the task, and tells the user: "❌ `<filename>` not found. Run `/<workflow>` first, then continue."

#### Scenario: all reads: files present
- **WHEN** all files listed in `reads:` exist
- **THEN** the AI reads each file for context before executing the task

### Requirement: Task files use env var prefixes in `files:`
All paths in the `files:` frontmatter field SHALL begin with `$DESIGNBOOK_DIST/` or `$DESIGNBOOK_DRUPAL_THEME/`. Bare relative paths are not allowed.

#### Scenario: DESIGNBOOK_DIST output file
- **WHEN** a task writes to the designbook output directory
- **THEN** the `files:` path begins with `$DESIGNBOOK_DIST/`

#### Scenario: theme output file
- **WHEN** a task writes to the Drupal theme directory
- **THEN** the `files:` path begins with `$DESIGNBOOK_DRUPAL_THEME/`

### Requirement: reads: convention documented in designbook-addon-skills
The `designbook-addon-skills/SKILL.md` task file frontmatter spec SHALL include `reads:` with its structure, semantics, and the AI behavior rule for missing files.

#### Scenario: convention reference
- **WHEN** a developer reads designbook-addon-skills/SKILL.md
- **THEN** they find the complete `reads:` field spec including the missing-file error format

### Requirement: reads: integrated into workflow task execution (designbook-workflow)
The `designbook-workflow/SKILL.md` AI Rules SHALL include a rule requiring the AI to check `reads:` before executing each task stage.

#### Scenario: workflow task execution with reads
- **WHEN** the AI starts a task stage
- **THEN** it checks `reads:` in the task file frontmatter before doing any work
