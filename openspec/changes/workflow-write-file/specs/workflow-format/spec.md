## MODIFIED Requirements

### Requirement: Task file frontmatter — when, params, files

```yaml
# tasks/create-component.md
---
when:
  component.framework: sdc
params:
  component: page
files:
  - file: $DESIGNBOOK_DIRS_COMPONENTS/{{ component }}/{{ component }}.component.yml
    key: component
    validators: [component]
  - file: $DESIGNBOOK_DIRS_COMPONENTS/{{ component }}/{{ component }}.story.yml
    key: story
    validators: [scene]
---
```

#### Scenario: Structured file declaration parsed
- **WHEN** the AI instantiates a task with `params: { component: page }`
- **THEN** file paths are resolved: `components/page/page.component.yml` and `components/page/page.story.yml`
- **AND** keys (`component`, `story`) and validators (`[component]`, `[scene]`) are preserved in tasks.yml

#### Scenario: Key used in task body for write-file
- **WHEN** the task body instructs output
- **THEN** it references `designbook workflow write-file $WORKFLOW_NAME $TASK_ID --key component`
- **AND** the resolved file path is NOT mentioned in the task body

## MODIFIED Requirements

### Requirement: Extended WorkflowTask data model for resolution mode

Each task in tasks.yml MAY store pre-resolved execution context when `workflow plan` is used in resolution mode:

```yaml
params:
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
        key: component
        validators: [component]
        requires_validation: true
```

#### Scenario: params stored at plan time (global)
- **WHEN** `workflow plan --params '<json>'` is called
- **THEN** the top-level `params` object is written to tasks.yml

#### Scenario: params stored at plan time (per-task)
- **WHEN** a task entry is generated from an item with params
- **THEN** the task has a `params` object with the item's params (merged with task file defaults)

#### Scenario: files include key and validators after plan
- **WHEN** `workflow plan` resolves a task with structured file declarations
- **THEN** each file entry in tasks.yml includes `path` (resolved), `key`, `validators`, and `requires_validation: true`

#### Scenario: depends_on stored per task
- **WHEN** the CLI computes dependencies from stage ordering
- **THEN** each task has `depends_on: [task-id, ...]` (empty array for first-stage tasks)

#### Scenario: task_file stored per task
- **WHEN** the CLI resolves a task file for a stage
- **THEN** the task has `task_file: /abs/path/to/task-file.md`

#### Scenario: rules stored per task
- **WHEN** the CLI matches rule files for a task's stage
- **THEN** the task has `rules: [/abs/path/rule1.md, ...]`
