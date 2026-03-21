## MODIFIED Requirements

### Requirement: WorkflowTask data model

Each task in tasks.yml stores files produced, validation state, and resolved execution context:

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
    task_file: /abs/path/.agents/skills/designbook-components-sdc/tasks/create-component.md
    rules:
      - /abs/path/.agents/skills/designbook-css-daisyui/rules/daisyui-naming.md
    config_rules:
      - "Komponenten-Namen immer auf Englisch, kebab-case"
    config_instructions:
      - "Nach Erstellung prüfen ob die Komponente im Storybook ohne Fehler rendert"
    files:
      - path: /abs/path/components/button/button.component.yml
        requires_validation: true
      - path: /abs/path/components/button/button.twig
        requires_validation: true
    validation_status: failed
    last_validated: "2026-03-16T14:22:01Z"
    validation_results:
      - { file: "../components/button/button.component.yml", type: component, valid: true }
      - { file: "../components/button/button.twig", type: story, valid: false,
          error: "button.twig:5: Variable 'label' is not defined" }
```

#### Scenario: Files persisted on task update
- **WHEN** `workflow update --status in-progress --files [...]` is called
- **THEN** `files[]` is stored on the task and `validation_status` is set to `pending`

#### Scenario: Timestamps updated on validate
- **WHEN** `workflow validate` runs
- **THEN** `last_validated` is set; `last_passed` is set if all pass, `last_failed` if any fail

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
