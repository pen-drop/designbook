# designbook-skill-creator Specification

## Purpose
TBD - created by archiving change project-setup. Update Purpose after archive.
## Requirements
### Requirement: Skill creator meta-skill exists
The project SHALL have a `designbook-skill-creator` skill at `.agents/skills/designbook-skill-creator/` that documents the authoritative architecture for all designbook skills.

#### Scenario: Skill directory present
- **WHEN** Claude or a developer looks for skill authoring guidance
- **THEN** `.agents/skills/designbook-skill-creator/SKILL.md` exists and describes the 3-part project architecture and the 4-level skill model

### Requirement: 4-level model documented
The `designbook-skill-creator` skill SHALL document the 4-level model: workflow → task → blueprint/rule.

#### Scenario: Levels are defined
- **WHEN** the skill is loaded
- **THEN** it explains: workflows define stages/steps; tasks declare WHAT to produce (never HOW); blueprints provide overridable examples (directory structure, naming); rules are hard constraints that cannot be overridden

### Requirement: Principles documented
The skill SHALL define the core design principles that govern all designbook skill authoring.

#### Scenario: Task principle enforced
- **WHEN** a task file is authored or reviewed
- **THEN** the principle "tasks say WHAT, never HOW" is documented and cited

#### Scenario: Blueprint vs rule distinction clear
- **WHEN** a contributor decides where to put a constraint
- **THEN** the skill clearly distinguishes: blueprints are overridable starting points (e.g. a specific directory layout or naming convention); rules are absolute and never overridden by integrations

### Requirement: Skill map present
The skill SHALL contain a map of all existing skills across the three project parts.

#### Scenario: Part 1 — core skill listed
- **WHEN** the skill map is read
- **THEN** `designbook` is listed as Part 1 with its available workflows

#### Scenario: Part 2 — addon skill listed
- **WHEN** the skill map is read
- **THEN** `designbook-addon-skills` is listed as Part 2 (Storybook addon development only)

#### Scenario: Part 3 — integration skills listed
- **WHEN** the skill map is read
- **THEN** `designbook-css-tailwind`, `designbook-drupal`, `designbook-stitch`, `designbook-devtools` are listed as Part 3 integrations

### Requirement: CLAUDE.md references skill-creator for skill changes
`CLAUDE.md` SHALL instruct Claude to load `designbook-skill-creator` before modifying any file under `.agents/skills/`.

#### Scenario: Skill change context
- **WHEN** Claude is about to edit a skill file
- **THEN** `CLAUDE.md` provides the instruction to load the skill-creator first

### Requirement: Research guidance included
The skill SHALL document the `--research` flag convention for auditing workflow execution.

#### Scenario: Research flag described
- **WHEN** a workflow produces unexpected output or errors
- **THEN** the skill documents that appending `--research` to a debo command triggers a post-run diagnostic audit of the skill infrastructure

