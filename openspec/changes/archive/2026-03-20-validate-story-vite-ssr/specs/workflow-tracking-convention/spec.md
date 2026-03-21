## MODIFIED Requirements

### Requirement: Workflows SHALL update task status during execution

Each workflow step that produces file output SHALL call `designbook workflow update` with `--status done` and `--files` listing all files produced, relative to the designbook directory.

#### Scenario: Task completion triggers update with files

- **WHEN** a workflow step completes successfully and produces files
- **THEN** the workflow calls `designbook workflow update <name> <task-id> --status done --files <file1> <file2> ...`

#### Scenario: Files stored in tasks.yml

- **WHEN** `workflow update` is called with `--files`
- **THEN** the files are saved in `tasks.yml` under the task and `validation_status` is set to `pending`

## ADDED Requirements

### Requirement: WorkflowTask tracks produced files and validation state

Each `WorkflowTask` in `tasks.yml` SHALL store the files it produced and their validation state:

```yaml
tasks:
  - id: create-button
    title: Create Button Component
    type: component
    status: done
    files:
      - ../components/button/button.component.yml
      - ../components/button/button.default.story.yml
    validation_status: failed
    last_validated: "2026-03-16T14:22:01Z"
    last_failed: "2026-03-16T14:22:01Z"
    validation_results:
      - { file: "../components/button/button.component.yml", type: component, valid: true }
      - { file: "../components/button/button.default.story.yml", type: story, valid: false,
          error: "button.twig:5: Variable 'label' is not defined" }
```

#### Scenario: Files persisted on task update

- **WHEN** `workflow update --status done --files [...]` is called
- **THEN** `files[]` is stored on the task and `validation_status` is set to `pending`

#### Scenario: Timestamps updated on validate

- **WHEN** `workflow validate <name>` runs and all files pass
- **THEN** `last_validated` and `last_passed` are set to the current ISO timestamp
- **WHEN** `workflow validate <name>` runs and any file fails
- **THEN** `last_validated` and `last_failed` are set to the current ISO timestamp

### Requirement: `workflow validate` validates all workflow files

The `workflow validate <name>` command SHALL validate all files registered across all tasks of a workflow, update results in tasks.yml, and output one JSON line per file.

#### Scenario: All files pass

- **WHEN** `workflow validate debo-design-component` is run and all registered files validate successfully
- **THEN** output is one `{ task, file, type, valid: true }` line per file and exit code is 0

#### Scenario: Story file fails

- **WHEN** a `.story.yml` file fails to render via the `/__validate` endpoint
- **THEN** output includes `{ task, file, type: "story", valid: false, error: "<twig error message>" }` and exit code is 1

#### Scenario: Storybook not running

- **WHEN** `workflow validate` runs and Storybook is not reachable on the configured port
- **THEN** story files output `{ type: "story", valid: null, skipped: true, reason: "Storybook not running" }` and exit code is 0

#### Scenario: Re-validate after fix

- **WHEN** a skill fixes a broken file and re-runs `workflow validate <name>`
- **THEN** `validation_results` is updated, `last_validated` is refreshed, and `last_passed` is set if all now pass

### Requirement: Workflow panel shows files and validation status

The Storybook workflow panel SHALL display each task's `files[]` and per-file `validation_status`.

#### Scenario: Files visible in panel

- **WHEN** a task has `files[]` set
- **THEN** the panel shows the file paths with a validation badge: ✅ passed / ❌ failed / ⏭ skipped / ⏳ pending

#### Scenario: Error visible in panel

- **WHEN** a file has `valid: false` in `validation_results`
- **THEN** the panel shows the `error` message inline below the file path

#### Scenario: Timestamps visible in panel

- **WHEN** a task has `last_validated` set
- **THEN** the panel shows when the task was last validated, and whether it last passed or failed
