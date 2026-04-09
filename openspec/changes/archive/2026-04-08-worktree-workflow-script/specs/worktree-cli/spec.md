## ADDED Requirements

### Requirement: wt start creates worktree and switches into it

`wt start <branch>` SHALL create a git worktree under `.worktrees/<branch>/` using `git worktree add .worktrees/<branch> -b <branch>`, run `./scripts/setup-workspace.sh` inside the worktree, and switch the shell into that directory.

#### Scenario: New worktree is created
- **WHEN** user runs `wt start feat/my-feature`
- **THEN** `.worktrees/feat/my-feature/` is created as a git worktree on branch `feat/my-feature`, `./scripts/setup-workspace.sh` is executed in the worktree, and the shell switches into that directory

#### Scenario: Branch already exists
- **WHEN** user runs `wt start feat/existing` and branch `feat/existing` already exists
- **THEN** the worktree is created without the `-b` flag (uses existing branch) and the shell switches into it

#### Scenario: Worktree already exists
- **WHEN** user runs `wt start feat/already-open` and `.worktrees/feat/already-open/` already exists
- **THEN** an error message is shown suggesting `wt switch` instead

### Requirement: wt switch changes into existing worktree

`wt switch [branch]` SHALL switch the shell into an existing worktree under `.worktrees/`.

#### Scenario: Switch with branch argument
- **WHEN** user runs `wt switch feat/my-feature`
- **THEN** the shell switches to `.worktrees/feat/my-feature/`

#### Scenario: Switch without argument — interactive selection
- **WHEN** user runs `wt switch` without argument and multiple worktrees exist
- **THEN** a numbered list of all active `.worktrees/` entries is shown, and after selection the shell switches into the chosen worktree

#### Scenario: Switch without argument — single worktree
- **WHEN** user runs `wt switch` without argument and exactly one worktree exists
- **THEN** the shell switches directly into that worktree without prompting

#### Scenario: Switch without argument — no worktrees
- **WHEN** user runs `wt switch` without argument and no worktrees exist
- **THEN** a message is shown that no active worktrees are available

### Requirement: wt status shows active worktrees

`wt status` SHALL display an overview of all manual worktrees under `.worktrees/`.

#### Scenario: Worktrees exist
- **WHEN** user runs `wt status`
- **THEN** a table with branch name, path, and last commit date is displayed

#### Scenario: No worktrees exist
- **WHEN** user runs `wt status` and no `.worktrees/` entries exist
- **THEN** "No active worktrees" is displayed

### Requirement: wt finish validates, commits, pushes, and removes

`wt finish` SHALL finalize the current worktree: run `pnpm check`, commit all changes, push the branch, and remove the worktree.

#### Scenario: Successful finish
- **WHEN** user runs `wt finish` from a `.worktrees/` directory
- **THEN** `pnpm check` is executed, all changes are committed, the branch is pushed to origin, the shell switches back to the repo root, and the worktree is removed

#### Scenario: pnpm check fails
- **WHEN** user runs `wt finish` and `pnpm check` fails
- **THEN** the script aborts with an error message, the worktree remains intact

#### Scenario: Not in a worktree
- **WHEN** user runs `wt finish` but is not in a `.worktrees/` directory
- **THEN** an error message is displayed

### Requirement: .worktrees directory in .gitignore

`.worktrees/` MUST be listed in `.gitignore`.

#### Scenario: gitignore contains .worktrees
- **WHEN** the repository is configured
- **THEN** `.gitignore` contains the entry `.worktrees/`
