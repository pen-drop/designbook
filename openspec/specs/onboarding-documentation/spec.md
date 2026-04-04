# Onboarding Documentation

## Purpose
Define requirements for distributing and exposing onboarding documentation within the Designbook ecosystem.
## Requirements
### Requirement: Documentation Distribution
The addon SHALL include the onboarding documentation files (`onboarding/*.mdx`) in its package distribution.

#### Scenario: Package Content
- **WHEN** the package is built and packed
- **THEN** the `dist/onboarding` (or equivalent) directory contains the MDX files

### Requirement: Documentation Exposure
The addon SHALL provide a way for consumers to locate the documentation files for configuration.

#### Scenario: Locating Docs
- **WHEN** a consumer configures their Storybook `main.js`
- **THEN** they can reference the addon's documentation files via a stable path (e.g., `node_modules/storybook-addon-designbook/dist/onboarding/*.mdx`)

### Requirement: Workspace setup rule documented
`CLAUDE.md` SHALL document that a workspace MUST be created before working on any integration (drupal, tailwind, etc.) using `./scripts/setup-workspace.sh <name>`.

#### Scenario: Integration development setup
- **WHEN** Claude or a developer starts working on an integration feature
- **THEN** `CLAUDE.md` states: run `./scripts/setup-workspace.sh <name>` from the repo root (or worktree root) before any integration work

### Requirement: Workspace always rebuilds
The `setup-workspace.sh` script SHALL always rebuild the workspace from scratch, removing any existing workspace directory first.

#### Scenario: Existing workspace
- **WHEN** `setup-workspace.sh <name>` is run and `workspaces/<name>/` already exists
- **THEN** the script removes the existing directory and creates a fresh workspace

### Requirement: Workspace uses copies not symlinks
The `setup-workspace.sh` script SHALL copy `.agents` and `.claude` from the current working directory into the workspace instead of creating symlinks to the repo root.

#### Scenario: Copy from CWD
- **WHEN** the workspace is set up from a git worktree
- **THEN** `.agents` and `.claude` in the workspace are copies of the worktree's versions, not symlinks to the main repo

#### Scenario: Skill isolation
- **WHEN** a developer edits skill files after workspace setup
- **THEN** the workspace retains its snapshot; re-running the script is required to pick up changes

### Requirement: Worktree workspace behavior documented
`CLAUDE.md` SHALL document that workspace setup in a git worktree uses the worktree's own `.agents`/`.claude` files, ensuring skill changes under development are reflected in the workspace.

#### Scenario: Worktree isolation
- **WHEN** `setup-workspace.sh` is run inside a git worktree
- **THEN** the workspace reflects the worktree's current skill state, not main branch

