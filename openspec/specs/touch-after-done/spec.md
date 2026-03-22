# touch-after-done Specification

## Purpose
After workflow done marks a task complete, touch all task files to trigger Storybook file watcher re-reads.

---

## Requirement: workflow done touches task files after completion

After `workflow done` marks a task as complete, it SHALL update the modification timestamp of every file in `task.files[]` that exists on disk. This triggers file watcher re-reads in Storybook.

#### Scenario: Files are touched after task completion
- **WHEN** `workflow done --workflow <name> --task <id>` succeeds
- **THEN** every file in `task.files[]` that exists on disk has its modification time updated to the current time

#### Scenario: Missing files are skipped during touch
- **WHEN** a file in `task.files[]` does not exist on disk
- **THEN** that file is silently skipped (no error thrown from the touch step — the existing validation already handles missing files)

#### Scenario: Touch happens after status update
- **WHEN** the task status is set to `done`
- **THEN** files are touched before the archive check runs
