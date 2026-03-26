# workflow-format Specification

## Purpose
Defines how workflows are declared: the YAML frontmatter format, marker syntax, task/rule file discovery, and the stages-based composition model.

---

## Requirements

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

#### Scenario: Frontmatter is parsed on workflow start
- **WHEN** a debo-* workflow file contains a `workflow:` block
- **THEN** the AI extracts the title and stages array

---

### Requirement: !WORKFLOW_FILE marker

Workflow and skill files SHALL use `!WORKFLOW_FILE <task-id>: <path>` to declare file production.

#### Scenario: Marker indicates file creation point
- **WHEN** a step contains `!WORKFLOW_FILE create-tokens: design-system/design-tokens.yml`
- **THEN** the AI knows this step will create/modify that file and calls `workflow update --files <path>` to register it

#### Scenario: Multiple files per task
- **WHEN** a task produces multiple files
- **THEN** each has its own `!WORKFLOW_FILE` marker and is independently registered and validated

#### Scenario: Markers are declarative, not imperative
- Markers are signals for the AI; the AI is responsible for executing the corresponding CLI commands

---

### Requirement: !WORKFLOW_DONE marker

Workflow files SHALL use `!WORKFLOW_DONE` to signal workflow completion.

#### Scenario: Marks end of workflow
- **WHEN** the `!WORKFLOW_DONE` marker is reached
- **THEN** all tasks must be done and the workflow auto-archives

---

### Requirement: Task files use filename as stage selector

A task file's filename (without extension) SHALL match the stage name it applies to.

#### Scenario: Task file for create-component stage
- **WHEN** a workflow executes stage `create-component`
- **THEN** the AI scans all `skills/*/tasks/create-component.md` files and loads those whose `when` conditions match

#### Scenario: No when — always applies
- **WHEN** a task file has no `when` frontmatter field
- **THEN** it is loaded for any config when the stage name matches

#### Scenario: Multiple task files match same stage
- **WHEN** two skills both have `tasks/create-component.md`
- **THEN** both are candidates; `when` conditions disambiguate; if both match, both are loaded (additive)

---

### Requirement: Task file frontmatter — when, params, files

```yaml
# tasks/create-component.md
---
when:
  component.framework: sdc
params:
  component: page
files:
  - components/{{ component }}/{{ component }}.component.yml
---
```

#### Scenario: Param substitution in files
- **WHEN** the AI instantiates a task with `params: { component: page }`
- **THEN** `components/{{ component }}/{{ component }}.component.yml` resolves to `components/page/page.component.yml`

---

### Requirement: Rule files use when to scope to stages and config

Rule files in `skills/<name>/rules/` are candidates for all stages; `when` narrows scope.

#### Scenario: Rule scoped to stage
- **WHEN** `rules/drupal-field-naming.md` declares `when: { stage: create-data-model, backend: drupal }`
- **THEN** it is applied only during `create-data-model` when `DESIGNBOOK_BACKEND=drupal`

#### Scenario: Rule without stage scope
- **WHEN** a rule has no `when.stage`
- **THEN** it is applied to all stages where its other `when` conditions match

#### Scenario: AI applies rules as hard constraints
- **WHEN** matching rule files are found for a task
- **THEN** the AI applies all rule constraints during file creation (same weight as SKILL.md rules)

---

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

---

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

---

### Requirement: Tasks are collected at runtime after dialog stage

Concrete task instances SHALL be determined by the AI after the dialog stage — never declared in workflow frontmatter.

#### Scenario: Tasks collected after dialog
- **WHEN** the dialog stage completes
- **THEN** the AI determines which task files to instantiate, substitutes params from dialog result, and calls `workflow create --tasks '<json>'` before any file creation

#### Scenario: Stage gate
- **WHEN** all tasks in stage `create-component` reach status `done`
- **THEN** the AI proceeds to stage `create-scene`

#### Scenario: Within-stage order is free
- **WHEN** stage `create-component` has multiple tasks
- **THEN** the AI MAY execute them in any order

---

### Requirement: Extended WorkflowTask data model for resolution mode

Each task in tasks.yml MAY store pre-resolved execution context when `workflow plan` is used in resolution mode:

```yaml
params:                            # global (from --params)
  section_id: dashboard

tasks:
  - id: create-component-button
    title: Create Button Component
    type: component
    status: done
    stage: create-component
    depends_on: []
    params:
      component: button
      slots: [icon, label]
    task_file: /abs/path/.agents/skills/designbook-drupal/components/tasks/create-component.md
    rules:
      - /abs/path/.agents/skills/designbook-css-daisyui/rules/daisyui-naming.md
    config_rules:
      - "Komponenten-Namen immer auf Englisch, kebab-case"
    config_instructions:
      - "Nach Erstellung prüfen ob die Komponente im Storybook ohne Fehler rendert"
    files:
      - path: /abs/path/components/button/button.component.yml
        requires_validation: true
```

#### Scenario: params stored at plan time (global)
- **WHEN** `workflow plan --params '<json>'` is called
- **THEN** the top-level `params` object is written to tasks.yml

#### Scenario: params stored at plan time (per-task)
- **WHEN** a task entry is generated from an item with params
- **THEN** the task has a `params` object with the item's params (merged with task file defaults)

#### Scenario: depends_on stored per task
- **WHEN** the CLI computes dependencies from stage ordering
- **THEN** each task has `depends_on: [task-id, ...]` (empty array for first-stage tasks)

#### Scenario: task_file stored per task
- **WHEN** the CLI resolves a task file for a stage
- **THEN** the task has `task_file: /abs/path/to/task-file.md`

#### Scenario: rules stored per task
- **WHEN** the CLI matches rule files for a task's stage
- **THEN** the task has `rules: [/abs/path/rule1.md, ...]`

#### Scenario: config_rules stored per task
- **WHEN** `designbook.config.yml` contains `workflow.rules.<stage>` entries for the task's stage
- **THEN** the task has `config_rules: ["string", ...]`

#### Scenario: config_instructions stored per task
- **WHEN** `designbook.config.yml` contains `workflow.tasks.<stage>` entries for the task's stage
- **THEN** the task has `config_instructions: ["string", ...]`

#### Scenario: params and depends_on absent is valid (backwards compat)
- **WHEN** `workflow plan` is called via the old interface (without `--workflow-file` and `--items`)
- **THEN** no `params`, `depends_on`, `task_file`, or `rules` are written; existing behavior is unchanged

---

### Requirement: tasks.yml stores stages array and flat stage field per task

#### Scenario: tasks.yml structure
- **WHEN** `workflow create --tasks '<json>'` runs
- **THEN** tasks.yml contains a top-level `stages` array and each task entry has a flat `stage` field — no nesting or parent/child relationships
