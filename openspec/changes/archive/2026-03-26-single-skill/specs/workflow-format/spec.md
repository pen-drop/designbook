## MODIFIED Requirements

### Requirement: YAML frontmatter workflow metadata
Workflow definition files SHALL live at `<concern>/workflows/<workflow-id>.md` within the unified `designbook` skill, replacing `debo-*.md` files in `.agents/workflows/`. The frontmatter is simplified — no skill registration fields.

```yaml
---
title: Design Screen
description: Create screens, pages, and views for a section
stages: [design-screen:intake, create-component, design-screen:plan-entities,
         design-screen:map-entity, design-screen:create-scene]
before:
  - workflow: css-generate
    execute: if-never-run
---
```

#### Scenario: Workflow file parsed on dispatch
- **WHEN** the `designbook` skill dispatches to `design-screen`
- **THEN** it reads `design/workflows/design-screen.md` and extracts `title`, `description`, `stages`, and `before`

#### Scenario: Frontmatter contains no registration fields
- **WHEN** any `workflows/*.md` file is read
- **THEN** its frontmatter does NOT contain `name:`, `id:`, or `category:`

#### Scenario: description is required and used for dispatch
- **WHEN** the skill scans `**/workflows/*.md` at dispatch time
- **THEN** each file's `description` field is matched against the user's argument or intent to select the correct workflow
- **AND** the description contains specific trigger phrases (e.g. "create screens, pages, views for a section") that the broad SKILL.md description does not need to repeat

#### Scenario: debo-*.md files no longer exist
- **WHEN** any system scans `.agents/workflows/debo-*.md`
- **THEN** no files are found — replaced by `<concern>/workflows/<workflow-id>.md`

## MODIFIED Requirements

### Requirement: Stage reference resolution — colon syntax
Stage names in workflow frontmatter SHALL support two forms: plain names (shared tasks) and `<workflow-id>:<task>` (workflow-specific tasks resolved via glob).

#### Scenario: Plain stage resolves to shared task
- **WHEN** a stage is declared as `create-component` (no colon)
- **THEN** the system scans `**/tasks/create-component.md` across all skill dirs and applies `when:` filtering

#### Scenario: Colon stage resolves to qualified task file
- **WHEN** a stage is declared as `design-screen:intake`
- **THEN** the system resolves via glob `**/intake--design-screen.md` within the skill

#### Scenario: Colon syntax extends existing skill:task pattern
- **WHEN** `design-screen:intake` is used
- **THEN** it resolves analogously to the old `designbook-vision:intake` — but via glob within the unified skill instead of a direct skill-dir path

## MODIFIED Requirements

### Requirement: File locations
Task, rule, and resource files SHALL follow the unified three-level skill structure:

- Skill root resources: `skills/designbook/resources/` (execution engine)
- Concern-level shared tasks: `skills/designbook/<concern>/tasks/<task>.md`
- Workflow-specific tasks: `skills/designbook/<concern>/tasks/<task>--<workflow-id>.md`
- Concern-level shared rules: `skills/designbook/<concern>/rules/<rule>.md`
- Workflow-specific rules: `skills/designbook/<concern>/rules/<rule>--<workflow-id>.md`
- Workflow definitions: `skills/designbook/<concern>/workflows/<workflow-id>.md`
- Framework tasks/rules: `skills/designbook-css-<framework>/tasks/` and `rules/` (unchanged)

#### Scenario: Workflow-specific task discovered via colon stage
- **WHEN** stage `design-screen:create-scene` is resolved
- **THEN** glob finds `designbook/design/tasks/create-scene--design-screen.md`

#### Scenario: Shared task discovered via plain stage
- **WHEN** stage `create-component` is resolved
- **THEN** glob finds `designbook/design/tasks/create-component.md`

#### Scenario: before workflow reference is relative
- **WHEN** a workflow declares `before: workflow: css-generate`
- **THEN** the system resolves to `designbook/css-generate/workflows/css-generate.md`
