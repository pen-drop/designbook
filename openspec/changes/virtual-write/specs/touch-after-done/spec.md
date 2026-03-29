## MODIFIED Requirements

### Requirement: workflow done touches task files after workflow completion

After the final task in a workflow is marked complete and WORKTREE files are copied to `DESIGNBOOK_ROOT`, the system SHALL update the modification timestamp of every copied file. This triggers file watcher re-reads in Storybook once, after all files are in their final state.

#### Scenario: Files are touched after bulk WORKTREE copy
- **WHEN** `workflow done` detects the last task is complete and copies WORKTREE to `DESIGNBOOK_ROOT`
- **THEN** every file that was copied has its modification time updated to the current time

#### Scenario: Missing files are skipped during touch
- **WHEN** a file in the copy list does not exist on disk after the copy step
- **THEN** that file is silently skipped (no error thrown)

#### Scenario: Touch happens after copy, before WORKTREE cleanup
- **WHEN** the bulk copy completes
- **THEN** files are touched before the WORKTREE directory is removed

#### Scenario: No per-task touch during workflow execution
- **WHEN** an individual task (not the final task) is marked done
- **THEN** no files are touched — Storybook should not observe intermediate WORKTREE writes
