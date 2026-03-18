## ADDED Requirements

### Requirement: SKILL.md is index-only
Every `designbook-*/SKILL.md` SHALL contain only: frontmatter (`name`, `description`), a brief one-paragraph overview, links to task/rule/resource files, and optional reference material (schemas, format specs). Execution instructions, procedural steps, and "load X skill" directives SHALL NOT appear in SKILL.md.

#### Scenario: No execution instructions in SKILL.md
- **WHEN** an AI agent loads a `designbook-*/SKILL.md`
- **THEN** the file contains no step-by-step procedures, no CLI commands to run, and no directives to load other skills

#### Scenario: Task execution content in task files
- **WHEN** a workflow stage requires execution guidance
- **THEN** that guidance lives in `tasks/<stage>.md`, not in SKILL.md

#### Scenario: Reference content is allowed
- **WHEN** SKILL.md contains a schema diagram, valid value list, or format specification
- **THEN** this is permitted as reference material, provided it contains no imperative instructions
