## MODIFIED Requirements

### Requirement: WorkflowTask data model

Each task in tasks.yml stores files produced and validation state:

```yaml
tasks:
  - id: create-button
    title: Create Button Component
    type: component
    status: done
    stage: create-component
    files:
      - path: ../components/button/button.component.yml
        key: component
        validators: [component]
        validation_result:
          valid: true
          last_validated: "2026-03-28T14:22:01Z"
```

#### Scenario: Workflow creation sets planning status
- **WHEN** `designbook-workflow create` runs
- **THEN** tasks.yml contains `status: planning`

#### Scenario: Workflow transitions to running
- **WHEN** the first file is written via `workflow write-file`
- **THEN** status automatically transitions from `planning` to `running`

#### Scenario: Workflow transitions to completed
- **WHEN** the last task is set to `done`
- **THEN** status automatically transitions to `completed` and the workflow is moved to `workflows/archive/`

#### Scenario: Status updates are atomic
- **WHEN** status changes
- **THEN** the file is written atomically (temp file + rename) to prevent corruption

## ADDED Requirements

### Requirement: Engine flush at stage boundary

The direct engine SHALL flush stashed files to their target paths when a stage completes. The git-worktree engine flush is a no-op.

#### Scenario: Direct engine flushes stash to target
- **WHEN** all tasks in a stage reach `done` and engine is `direct`
- **THEN** for each file with `validation_result` present: `mv stash → file.path`
- **AND** `utime(now)` is called on ALL moved files after all moves complete
- **AND** the stash directory for the stage is removed

#### Scenario: Git-worktree engine flush is no-op
- **WHEN** all tasks in a stage reach `done` and engine is `git-worktree`
- **THEN** flush does nothing — files were already written to WORKTREE target paths

#### Scenario: Files without validation_result are skipped
- **WHEN** a task file has no `validation_result` (not yet written)
- **THEN** flush skips it without error

### Requirement: workflow done is a gate-check only

`workflow done` SHALL NOT run any validation. It only asserts that all files are written and valid.

#### Scenario: All files green — task done
- **WHEN** `workflow done --task create-tokens` is called
- **AND** every file in the task has `validation_result.valid === true`
- **THEN** task status is set to `done`

#### Scenario: File not yet written — reject
- **WHEN** `workflow done --task create-tokens` is called
- **AND** a file has no `validation_result`
- **THEN** the command fails with error: "file `<key>` not yet written"

#### Scenario: File has validation errors — reject
- **WHEN** `workflow done --task create-tokens` is called
- **AND** a file has `validation_result.valid === false`
- **THEN** the command fails with error: "file `<key>` has errors: ..."

#### Scenario: Skill is responsible for fixing errors
- **WHEN** `write-file` returns `valid: false`
- **THEN** the skill/AI must fix the content and call `write-file` again until `valid: true`
- **AND** `workflow done` is only called after all files are green

## REMOVED Requirements

### Requirement: Step files encapsulate CLI commands

**Reason**: Replaced by `write-file` command. The old `add-files.md` step (registering files before validation) and `validate.md` step (separate validation pass) are no longer needed — `write-file` handles both in one command.
**Migration**: Task bodies use `designbook workflow write-file ... --key <key>` instead of loading step files.
