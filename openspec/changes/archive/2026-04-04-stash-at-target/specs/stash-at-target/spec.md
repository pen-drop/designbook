## ADDED Requirements

### Requirement: Stash files at target path with workflow-ID suffix

The direct engine SHALL write stashed files to `<target-path>.<workflow_id>.debo` — the same directory as the final target, with a suffix composed of the workflow's `workflow_id` and `.debo` extension. The `workflow_id` is the short hex suffix of the workflow name (e.g., `a1b2` from `css-generate-2026-03-29-a1b2`), persisted as a dedicated field in `tasks.yml`.

#### Scenario: File stashed at target location
- **WHEN** `engine.writeFile()` is called for a task file with target path `$DATA/designbook-css-tw/generate-color.jsonata`
- **AND** the workflow's `workflow_id` is `a1b2`
- **THEN** the file is written to `$DATA/designbook-css-tw/generate-color.jsonata.a1b2.debo`

#### Scenario: Relative paths resolve correctly from stash location
- **WHEN** a stashed file contains a relative path `../../design-system/design-tokens.yml`
- **AND** the target directory is `$DATA/designbook-css-tw/`
- **THEN** the relative path resolves to `$DATA/design-system/design-tokens.yml` (same as from the final target location)

#### Scenario: Stash file does not match target globs
- **WHEN** a stashed `.jsonata.a1b2.debo` file exists in a directory
- **AND** a glob pattern `*.jsonata` is evaluated
- **THEN** the stashed file is NOT matched

### Requirement: Flush renames stashed files to target path

The direct engine `flush()` SHALL rename each stashed file by stripping the `.<workflow_id>.debo` suffix, and then apply `utimesSync` batch-touch to all flushed files.

#### Scenario: Flush renames in-place
- **WHEN** `flush()` is called for a stage's tasks
- **THEN** `generate-color.jsonata.a1b2.debo` is renamed to `generate-color.jsonata`
- **AND** the renamed file receives a batch `utimesSync` touch

#### Scenario: Flush is atomic per file
- **WHEN** `flush()` renames a stashed file
- **THEN** the rename is a same-directory `renameSync` (guaranteed atomic on same filesystem)

### Requirement: Abandon cleans up stashed files by workflow_id

The direct engine cleanup/abandon SHALL remove all files matching `**/*.<workflow_id>.debo` under the workflow's target directories.

#### Scenario: Abandon removes orphaned stash files
- **WHEN** `engine.cleanup()` is called for a workflow with `workflow_id` `a1b2`
- **AND** two stashed files exist: `dir-a/file.jsonata.a1b2.debo` and `dir-b/file.css.a1b2.debo`
- **THEN** both files are deleted

#### Scenario: Abandon does not affect other workflows
- **WHEN** `engine.cleanup()` is called for a workflow with `workflow_id` `a1b2`
- **AND** a stashed file `dir-a/file.jsonata.c3d4.debo` exists from a different workflow
- **THEN** that file is NOT deleted

### Requirement: No separate stash directory

The direct engine SHALL NOT create or use a `workflows/changes/<name>/stash/` directory. The `stashDir()` and `stashPath()` helpers SHALL be removed.

#### Scenario: No stash subdirectory created
- **WHEN** `engine.writeFile()` is called
- **THEN** no `stash/` directory is created under the workflow's changes directory
