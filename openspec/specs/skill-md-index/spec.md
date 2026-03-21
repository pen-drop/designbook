# skill-md-index Specification

## Purpose
Defines the constraint that SKILL.md files are index-only documents — no execution instructions, procedural steps, or skill-loading directives may appear in them.

## Requirements

### Requirement: SKILL.md is index-only
Every `designbook-*/SKILL.md` SHALL contain only: frontmatter (`name`, `description`), a brief one-paragraph overview, links to task/rule/resource files, and optional reference material (schemas, format diagrams, valid value lists). Execution instructions, procedural steps, and "load X skill" directives SHALL NOT appear in SKILL.md. Per the skill-creator progressive disclosure model, the SKILL.md body SHOULD stay under 500 lines; designbook-* skills specifically target ~40 lines as execution content belongs in task/rule/resource files.

The test: if removing a section would prevent execution (AI rules, CLI commands, step-by-step procedures), it belongs in a task or rule file. If it is pure reference (schema diagram, valid value table, format spec), it MAY stay in SKILL.md.

#### Scenario: No execution instructions in SKILL.md
- **WHEN** an AI agent loads a `designbook-*/SKILL.md`
- **THEN** the file contains no step-by-step procedures, no CLI commands to run, and no directives to load other skills

#### Scenario: Task execution content in task files
- **WHEN** a workflow stage requires execution guidance
- **THEN** that guidance lives in `tasks/<stage>.md`, not in SKILL.md

#### Scenario: Reference content is allowed
- **WHEN** SKILL.md contains a schema diagram, valid value list, or format specification
- **THEN** this is permitted as reference material, provided it contains no imperative instructions

#### Scenario: AI execution rules in rule files
- **WHEN** a skill defines AI behavioral rules (e.g. resume check, reads gate, path resolution)
- **THEN** those rules live in `rules/<name>.md` with appropriate `when:` conditions, not in SKILL.md

#### Scenario: Reference docs in resources
- **WHEN** a skill has CLI reference, YAML format specs, or architecture documentation
- **THEN** that content lives in `resources/<topic>.md` with a link from SKILL.md

### Requirement: designbook-addon-skills documents the SKILL.md contract
The `designbook-addon-skills` meta-skill SHALL explicitly document the SKILL.md contract for designbook-* skills: what is allowed, what is not, and where displaced content belongs (tasks/, rules/, resources/). This MUST reference the skill-creator progressive disclosure model.

#### Scenario: Contract section in designbook-addon-skills
- **WHEN** a skill author reads `designbook-addon-skills/SKILL.md` or its resources
- **THEN** they find an explicit section describing what belongs in SKILL.md vs. task/rule/resource files

#### Scenario: New skill follows the contract
- **WHEN** a new `designbook-*` skill is created following the convention
- **THEN** its SKILL.md contains only frontmatter, overview, and index links — no execution logic
