## MODIFIED Requirements

### Requirement: workflow plan checks for uncommitted changes before creating worktree

Before creating the git worktree, `workflow plan` SHALL check for uncommitted changes under `outputs.root`. If changes exist, it reports them and requires the user to commit; if the user declines, the plan is aborted.

#### Scenario: pre-flight passes when working tree is clean
- **WHEN** `workflow plan` runs and `git status -- <outputs.root>` shows no changes
- **THEN** the plan proceeds directly to worktree creation

#### Scenario: pre-flight detects uncommitted changes
- **WHEN** `workflow plan` runs and uncommitted changes exist under `outputs.root`
- **THEN** `workflow plan` outputs the changed file list and exits with a non-zero code and message: "Uncommitted changes found under outputs.root. Commit them before running workflow plan."

#### Scenario: pre-flight commit clears the way
- **WHEN** the user commits the changes and re-runs `workflow plan`
- **THEN** the working tree is clean and the plan proceeds

---

### Requirement: workflow plan creates isolated write workspace

`workflow plan` SHALL create an isolated write workspace for the workflow. The workspace type is determined by whether git is available and the working directory is a git repo: if so, a full git worktree is created on a new branch; otherwise a plain `/tmp` directory is used as fallback.

#### Scenario: full git worktree created when git is available
- **WHEN** `workflow plan` runs in a git repository after pre-flight passes
- **THEN** `git worktree add $DESIGNBOOK_WORKSPACES/designbook-<name> -b workflow/<name>` is executed (full checkout, no sparse) and `worktree_branch` is set in `tasks.yml`

#### Scenario: plain directory fallback when git unavailable
- **WHEN** `workflow plan` runs outside a git repository or git is not installed
- **THEN** `mkdirSync(worktreePath)` is used and `worktree_branch` is not set in `tasks.yml`

#### Scenario: OUTPUTS vars always remapped regardless of workspace type
- **WHEN** either a git worktree or plain directory workspace is created
- **THEN** all `DESIGNBOOK_OUTPUTS_*` env vars are remapped to point inside the workspace path

#### Scenario: no seeding needed after pre-flight commit
- **WHEN** pre-flight commit succeeded (working tree was clean)
- **THEN** `seedWorktree` is not called — all files are present via full checkout
