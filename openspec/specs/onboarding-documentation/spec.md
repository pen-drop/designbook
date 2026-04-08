# Onboarding Documentation

## Purpose
Define requirements for workspace setup and onboarding documentation within the Designbook ecosystem.

## Requirements

### Requirement: Workspace setup rule documented
`CLAUDE.md` SHALL document that a workspace MUST be created before working on any integration (drupal, tailwind, etc.) using `./scripts/setup-workspace.sh <name>`.

#### Scenario: Integration development setup
- **WHEN** Claude or a developer starts working on an integration feature
- **THEN** `CLAUDE.md` MUST state: run `./scripts/setup-workspace.sh <name>` from the repo root (or worktree root) before any integration work

### Requirement: Workspace always rebuilds
The `setup-workspace.sh` script SHALL always rebuild the workspace from scratch, removing any existing workspace directory first.

#### Scenario: Existing workspace
- **WHEN** `setup-workspace.sh <name>` is run and `workspaces/<name>/` already exists
- **THEN** the script MUST remove the existing directory and create a fresh workspace

### Requirement: Workspace uses symlinks not copies
The `setup-workspace.sh` script SHALL create symlinks (`ln -sfn`) for `.agents`, `.claude`, and `openspec` from the repo root into the workspace, rather than copying these directories.

#### Scenario: Symlinks to repo root
- **WHEN** the workspace is set up
- **THEN** `.claude` in the workspace SHALL be a symlink to `$REPO_ROOT/.claude`
- **AND** `.agents` in the workspace SHALL be a symlink to `$REPO_ROOT/.agents`
- **AND** `openspec` in the workspace SHALL be a symlink to `$REPO_ROOT/openspec`

#### Scenario: Live skill updates
- **WHEN** a developer edits skill files in the repo root after workspace setup
- **THEN** the workspace SHALL immediately reflect those changes because the paths are symlinks

### Requirement: Workspace initializes a git repo
The `setup-workspace.sh` script SHALL initialize a standalone git repository in the workspace after copying template files and creating symlinks.

#### Scenario: Git init and commit
- **WHEN** the workspace is set up
- **THEN** the script MUST run `git init`, add all files, and create an initial commit

### Requirement: Workspace installs dependencies
The `setup-workspace.sh` script SHALL run `pnpm install` in the workspace after setup.

#### Scenario: Dependencies installed
- **WHEN** the workspace setup completes
- **THEN** `pnpm install` MUST have been run in the workspace directory

### Requirement: Worktree workspace behavior documented
`CLAUDE.md` SHALL document that workspace setup in a git worktree uses the worktree's own `.agents`/`.claude` files (via symlinks), ensuring skill changes under development are reflected in the workspace.

#### Scenario: Worktree isolation
- **WHEN** `setup-workspace.sh` is run inside a git worktree
- **THEN** the workspace SHALL reflect the worktree's current skill state via symlinks
