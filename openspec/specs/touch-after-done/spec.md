# touch-after-done Specification

## Purpose
After the engine flushes stashed files to their final paths at stage boundaries, touch all flushed files to trigger Storybook file watcher re-reads.

## Requirements

### Requirement: Engine flush touches files at stage boundaries
The direct engine's `flush()` method SHALL update the modification timestamp of every flushed file after renaming stashed files to their final paths. Touch happens in the engine `flush()` call, which is triggered by `onTransition` at stage boundaries (when a declared stage completes), not after each individual `workflow done` call.

#### Scenario: Files are touched after flush
- **WHEN** a declared stage completes and `onTransition` triggers `flush()` for that stage's tasks
- **THEN** every file that was renamed from its stash path to its final path SHALL have its modification time updated via `utimesSync`

#### Scenario: Delay before touch
- **WHEN** `flush()` renames one or more stashed files
- **THEN** it SHALL wait 200ms before touching, to let all renames settle before triggering the file watcher

#### Scenario: Missing or unwritten files are skipped during flush
- **WHEN** a task file has no `validation_result` (not yet written) or its stash file does not exist on disk
- **THEN** that file is silently skipped during flush (no rename, no touch)

#### Scenario: Touch errors are silently ignored
- **WHEN** `utimesSync` throws for a flushed file
- **THEN** the error SHALL be caught and silently ignored

### Requirement: Flush sets flushed_at timestamp
The engine `flush()` method SHALL set `flushed_at` to the current ISO timestamp on each file entry that was successfully renamed to its final path.

#### Scenario: flushed_at is set on flush
- **WHEN** a stash file is renamed to its final path
- **THEN** the corresponding file entry's `flushed_at` SHALL be set to the current ISO timestamp

### Requirement: Flush is triggered by stage transitions
The direct engine's `onTransition` hook SHALL call `flush()` for a stage's tasks when that stage is a declared stage (present in `stages` keys) and the lifecycle transitions away from it.

#### Scenario: Stage boundary triggers flush
- **WHEN** the lifecycle transitions from declared stage `execute` to the next stage
- **THEN** `flush()` SHALL be called with all tasks belonging to the `execute` stage

#### Scenario: Non-declared stage does not trigger flush
- **WHEN** the lifecycle transitions from an implicit stage like `committed`
- **THEN** `flush()` SHALL NOT be called
