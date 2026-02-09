
## ADDED Requirements

### Requirement: Centralized Agent Directory
The system MUST store all agent skills and workflows in a top-level `.agent/` directory, with subdirectories `skills/` and `workflows/`.

#### Scenario: Directory Existence
- **WHEN** the user lists the project root
- **THEN** the `.agent/` directory exists
- **AND** it contains `skills/` and `workflows/`

### Requirement: Standardized Skill Naming
All agent skills MUST be named with the prefix `designbook-` to ensure consistent discovery and namespace protection.

#### Scenario: Skill Naming
- **WHEN** a user lists the contents of `.agent/skills/`
- **THEN** all directories start with `designbook-`
- **AND** legacy skill names like `pendrop-*` are renamed to `designbook-*`

### Requirement: Standardized Workflow Naming
All agent workflows (commands) MUST be named with the prefix `debo-` to clearly distinguish them as Designbook workflows.

#### Scenario: Workflow Naming
- **WHEN** a user lists the contents of `.agent/workflows/`
- **THEN** all files start with `debo-`
- **AND** legacy command names like `product-vision.md` are renamed to `debo-product-vision.md`
- **AND** new workflows exist for all `designbook-figma-*` skills

### Requirement: Workflows for All Skills
The system MUST provide a comprehensive set of workflows such that every `designbook-figma-*` skill has a corresponding `debo-*` workflow file.

#### Scenario: Skill Coverage
- **WHEN** a user iterates through all `designbook-figma-*` skills in `.agent/skills/`
- **THEN** there exists a corresponding `debo-*.md` file in `.agent/workflows/` that calls it.

### Requirement: IDE Compatibility via Symlinks
The system MUST provide symlinks in `.cursor/skills` and `.cursor/commands` pointing to the new locations in `.agent/` to ensure existing IDE configurations continue to work.

#### Scenario: Symlink Verification
- **WHEN** a user navigates to `.cursor/skills`
- **THEN** it resolves to `.agent/skills`
- **AND** `.cursor/commands` resolves to `.agent/workflows`

### Requirement: Workflow-Skill Separation
Agent workflows MUST serve as thin wrappers that only invoke corresponding skills, containing no direct business logic.

#### Scenario: Workflow Content
- **WHEN** a user inspects a workflow file in `.agent/workflows/`
- **THEN** the content primarily consists of a call to a skill in `.agent/skills/`
