## MODIFIED Requirements

### Requirement: workflow done touches task files after completion

After `workflow done` marks a task as complete, it SHALL update the modification timestamp of every file in `task.files[]` that exists on disk **only when no git worktree is active** (`worktree_branch` is absent from `tasks.yml`). When a git worktree is active, `git merge` updates mtimes atomically — no per-task touch is needed or performed.

#### Scenario: Files are touched after task completion (no worktree)
- **WHEN** `workflow done --workflow <name> --task <id>` succeeds and `tasks.yml` has no `worktree_branch`
- **THEN** every file in `task.files[]` that exists on disk has its modification time updated to the current time

#### Scenario: No touch when git worktree is active
- **WHEN** `workflow done` succeeds and `tasks.yml` has `worktree_branch` set
- **THEN** no per-task touch is performed — files are in the worktree, Storybook cannot see them yet

#### Scenario: Missing files are skipped during touch
- **WHEN** a file in `task.files[]` does not exist on disk
- **THEN** that file is silently skipped

#### Scenario: Touch happens after status update
- **WHEN** the task status is set to `done` and no worktree is active
- **THEN** files are touched before the archive check runs
