## ADDED Requirements

### Requirement: write-file CLI command accepts content via stdin and delegates writing to the engine

The system SHALL provide a `designbook workflow write-file <workflow> <task-id> --key <key>` command that reads file content from stdin, delegates writing to the engine, validates centrally using the task's declared validators, and updates the task state in tasks.yml.

#### Scenario: Write file content from stdin via engine
- **WHEN** `designbook workflow write-file my-workflow create-tokens --key design-tokens` is called with YAML content on stdin
- **THEN** the CLI calls `engine.writeFile(task, "design-tokens", content)` which returns `{ path }`
- **AND** the engine writes the content to the appropriate location (stash for direct, WORKTREE path for git-worktree)

#### Scenario: Validation runs centrally against returned path
- **WHEN** `write-file` is called and the file's `validators` array contains `[tokens]`
- **THEN** `validateTokens()` is invoked against the `path` returned by `engine.writeFile()`
- **AND** the result is stored in `validation_result` on the task's file entry

#### Scenario: Validation result output to stdout
- **WHEN** `write-file` completes
- **THEN** it outputs JSON to stdout: `{ "valid": true|false, "errors": [...], "file_path": "..." }`

#### Scenario: Invalid content is still written
- **WHEN** stdin content fails validation
- **THEN** the file is still written (so the AI can inspect and retry)
- **AND** the JSON output contains `"valid": false` with error details

#### Scenario: Re-write overwrites content
- **WHEN** `write-file` is called again with the same `--key` for the same task
- **THEN** the engine overwrites the file with new content
- **AND** validation runs again, replacing the previous `validation_result`

#### Scenario: Unknown key is rejected
- **WHEN** `--key` does not match any file entry in the task's `files` array
- **THEN** the command exits with error and message indicating valid keys for the task

#### Scenario: Empty stdin is rejected
- **WHEN** stdin is empty (no content piped)
- **THEN** the command exits with error "No content provided on stdin"

### Requirement: Engine writeFile returns path

The engine interface SHALL provide `writeFile(task, key, content): { path }` that writes content and returns the written path. The write destination is an engine-internal concern.

#### Scenario: Direct engine writes to stash and returns stash path
- **WHEN** `engine.writeFile(task, "design-tokens", content)` is called on a direct engine
- **THEN** content is written to `workflows/changes/<workflow>/stash/<task-id>/design-tokens`
- **AND** `{ path: "<stash-path>" }` is returned

#### Scenario: Git-worktree engine writes to WORKTREE and returns WORKTREE path
- **WHEN** `engine.writeFile(task, "design-tokens", content)` is called on a git-worktree engine
- **THEN** content is written directly to the resolved WORKTREE target path
- **AND** `{ path: "<worktree-path>" }` is returned

#### Scenario: Write directory created automatically
- **WHEN** `writeFile` is called and the target directory does not exist
- **THEN** it is created automatically (including parent directories)

### Requirement: Engine flush (direct engine only)

The direct engine SHALL flush stashed files to their target paths at stage boundaries. The git-worktree engine flush is a no-op.

#### Scenario: Direct engine flush moves stash to target
- **WHEN** `engine.flush(tasks)` is called on a direct engine
- **THEN** for each file with `validation_result` present: mv stash → target path
- **AND** `utime(now)` is called on ALL moved files after all moves complete
- **AND** the stash directory is removed

#### Scenario: Git-worktree engine flush is no-op
- **WHEN** `engine.flush(tasks)` is called on a git-worktree engine
- **THEN** nothing happens (files already written to WORKTREE, existing commit/merge handles the rest)

#### Scenario: Stash cleaned up after flush
- **WHEN** direct engine flush completes
- **THEN** the stash directory for the flushed tasks is removed

### Requirement: Validator lookup by key

The system SHALL resolve validators by key from a static registry, not by glob pattern matching.

#### Scenario: Known validator key resolves to function
- **WHEN** `validators: [tokens]` is declared on a file
- **THEN** the system calls `validateTokens()` — no glob matching involved

#### Scenario: Empty validators array skips validation
- **WHEN** `validators: []` is declared on a file
- **THEN** no validation runs and the file is auto-passed (`valid: true, skipped: true`)

#### Scenario: Unknown validator key is rejected at plan time
- **WHEN** a task file declares `validators: [nonexistent]`
- **THEN** `workflow plan` fails with error listing available validator keys

#### Scenario: Multiple validators run in sequence
- **WHEN** `validators: [data-model, component]` is declared
- **THEN** both validators run; the file is valid only if all pass
