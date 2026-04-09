## MODIFIED Requirements

### Requirement: workflow plan computes worktree env map from DESIGNBOOK_WORKSPACE
When `workflow plan` creates a git worktree, it SHALL remap `DESIGNBOOK_WORKSPACE` to the worktree path. All `DESIGNBOOK_DIRS_*` env vars SHALL be re-derived by resolving their workspace-relative paths against the new `DESIGNBOOK_WORKSPACE` value. No other vars need individual remapping.

#### Scenario: Only DESIGNBOOK_WORKSPACE swapped for worktree
- **WHEN** `workflow plan` creates a worktree at `/tmp/wt-abc`
- **THEN** `DESIGNBOOK_WORKSPACE` SHALL be set to `/tmp/wt-abc` in the task env
- **AND** each `DESIGNBOOK_DIRS_<KEY>` SHALL be re-resolved as `resolve('/tmp/wt-abc', relPath)` where `relPath` is the relative path from the original workspace to the original dir
- **AND** `DESIGNBOOK_HOME` and `DESIGNBOOK_DATA` SHALL also be re-resolved relative to the new workspace

#### Scenario: File path templates use DESIGNBOOK_DIRS_* vars
- **WHEN** a task file declares `files: ["${DESIGNBOOK_DIRS_COMPONENTS}/{{ component }}/{{ component }}.component.yml"]`
- **THEN** the CLI expands `${DESIGNBOOK_DIRS_COMPONENTS}` from the worktree-remapped env
