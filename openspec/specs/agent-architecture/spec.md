# Agent Architecture

## Purpose
Defines the directory structure, naming conventions, and symlink strategy for agent skills and workflows.

## Requirements

### Requirement: Centralized Agent Directory
The system MUST store all agent skills and workflows in a top-level `.agents/` directory, with subdirectories `skills/` and `workflows/`.

#### Scenario: Directory Existence
- **WHEN** the user lists the project root
- **THEN** the `.agents/` directory exists
- **AND** it contains `skills/` and `workflows/`

### Requirement: Standardized Skill Naming
All Designbook-related agent skills MUST be named with the prefix `designbook-`. Non-Designbook skills (e.g. `openspec-*`, `frontend-design`) use their own prefix.

#### Scenario: Designbook Skill Naming
- **WHEN** a user lists the contents of `.agents/skills/`
- **THEN** all Designbook skills start with `designbook-` (e.g. `designbook-addon-skills`, `designbook-css-tailwind`, `designbook-drupal`, `designbook-skill-creator`, `designbook-stitch`, `designbook-test`)
- **AND** the core skill directory is `designbook/` (registered as `debo`)

#### Scenario: Non-Designbook Skills Coexist
- **WHEN** a user lists the contents of `.agents/skills/`
- **THEN** non-Designbook skills such as `openspec-*` and `frontend-design` also exist alongside Designbook skills

### Requirement: Standardized Workflow Naming
All agent workflows (commands) MUST be named with the prefix `opsx-` to clearly distinguish them as OpenSpec workflows.

#### Scenario: Workflow Naming
- **WHEN** a user lists the contents of `.agents/workflows/`
- **THEN** all files start with `opsx-` (e.g. `opsx-apply.md`, `opsx-new.md`, `opsx-verify.md`)

### Requirement: Workflows for OpenSpec Skills
The system MUST provide a corresponding `opsx-*` workflow file for each `openspec-*` skill.

#### Scenario: Skill Coverage
- **WHEN** a user iterates through all `openspec-*` skills in `.agents/skills/`
- **THEN** there exists a corresponding `opsx-*.md` file in `.agents/workflows/` that calls it

### Requirement: IDE Compatibility via Symlinks
The system MUST provide symlinks in both `.cursor/` and `.claude/` pointing to the canonical locations in `.agents/` to ensure IDE configurations continue to work.

#### Scenario: Cursor Symlinks
- **WHEN** a user navigates to `.cursor/skills`
- **THEN** it resolves to `.agents/skills`
- **AND** `.cursor/commands` resolves to `.agents/workflows`

#### Scenario: Claude Symlinks
- **WHEN** a user navigates to `.claude/skills`
- **THEN** it resolves to `.agents/skills`
- **AND** `.claude/commands` resolves to `.agents/workflows`

### Requirement: Workflow-Skill Separation
Agent workflows MUST serve as thin wrappers that only invoke corresponding skills, containing no direct business logic.

#### Scenario: Workflow Content
- **WHEN** a user inspects a workflow file in `.agents/workflows/`
- **THEN** the content primarily consists of a call to a skill in `.agents/skills/`

### Requirement: Designbook Workflows Live Inside the Skill
Designbook workflows (`debo` sub-commands) SHALL be defined as workflow files inside the `designbook/` skill directory under `<concern>/workflows/`, not as top-level `.agents/workflows/` files.

#### Scenario: Designbook Workflow Location
- **WHEN** a user looks for the `design-screen` workflow
- **THEN** it is found at `.agents/skills/designbook/design/workflows/design-screen.md`
- **AND** no `debo-design-screen.md` file exists in `.agents/workflows/`
