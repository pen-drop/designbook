## MODIFIED Requirements

### Requirement: workflow plan resolves task files from workflow-file and items

`workflow plan` SHALL accept `--workflow-file <path>` and `--items <json>` and resolve task files, file paths, dependencies, and rule files automatically.

#### Scenario: CLI reads stages from workflow-file frontmatter
- **WHEN** `workflow plan --workflow-file .agents/workflows/debo-design-screen.md` is called
- **THEN** the CLI parses the YAML frontmatter and extracts the `workflow.stages` array, skipping any stage ending in `:intake`

#### Scenario: Multiple task files resolved per step
- **WHEN** an item has `"stage": "generate-jsonata"`
- **AND** two skills provide `tasks/generate-jsonata.md` that both match the current config
- **THEN** the CLI creates a task for EACH matching task file
- **AND** both tasks belong to the same step and run in parallel

#### Scenario: Named stage resolution (skill:task format)
- **WHEN** an item has `"stage": "designbook-sections:create-section"`
- **THEN** the CLI resolves directly to `.agents/skills/designbook-sections/tasks/create-section.md` without scanning
- **AND** only one task is created (no multi-match for named stages)

#### Scenario: File path templates expanded with params and env vars
- **WHEN** a resolved task file declares `files: ["${DESIGNBOOK_OUTPUTS_ROOT}/components/{{ component }}/{{ component }}.component.yml"]`
- **THEN** the CLI expands `${DESIGNBOOK_OUTPUTS_ROOT}` from config and `{{ component }}` from the item's params

#### Scenario: Task ID generated from stage and params
- **WHEN** an item has `"stage": "create-component"` and `"params": {"component": "button"}`
- **THEN** the generated task ID is `create-component-button`

#### Scenario: No matching task file found
- **WHEN** no task file matches the item's stage name and config conditions
- **THEN** the step is silently skipped and excluded from the resolved plan
- **AND** a debug-level log message indicates the step was skipped

### Requirement: depends_on removed from resolved tasks

Resolved tasks SHALL NOT contain `depends_on` arrays. Execution order is determined by stage ordering: all tasks in step N complete before step N+1 begins.

#### Scenario: Execution order from stages
- **WHEN** workflow declares steps `[generate-jsonata, generate-css]`
- **AND** `generate-jsonata` resolves to two parallel tasks
- **THEN** neither task has a `depends_on` field
- **AND** the orchestrator runs both before proceeding to `generate-css`

### Requirement: workflow plan matches rule files per stage

`workflow plan` SHALL scan `.agents/skills/*/rules/*.md` frontmatter and store matched rule file paths per task.

#### Scenario: Rule file matched by stage
- **WHEN** a rule file has `when.stages: [create-component]` and a task has stage `create-component`
- **THEN** the rule file path is included in the task's `rules` array

#### Scenario: Rule file matched by config condition
- **WHEN** a rule file has `when: { "frameworks.css": "daisyui" }` and config has `frameworks.css: daisyui`
- **THEN** the rule file path is included for all tasks whose stage matches

#### Scenario: All tasks in a step receive the same rules
- **WHEN** two tasks are resolved for the `generate-jsonata` step
- **THEN** both tasks receive the same set of matched rule files
