## MODIFIED Requirements

### Requirement: workflow plan resolves task files from workflow-file and items

`workflow plan` SHALL accept `--workflow-file <path>` and `--params <json>` and resolve task files, file paths, dependencies, and rule files automatically. When a stage declares `each: <name>`, the params JSON MUST contain a key matching `<name>` whose value is an array of objects. Each object becomes a separate task with its own params.

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

#### Scenario: Iterable expansion via each declaration
- **WHEN** a workflow stage declares `each: section`
- **AND** `--params '{"section": [{"section_id": "a"}, {"section_id": "b"}]}'` is provided
- **THEN** the CLI creates one task per array item for each step in that stage
- **AND** each task receives the corresponding array item merged into its params

#### Scenario: Missing each key in params
- **WHEN** a stage declares `each: section`
- **AND** the params JSON does not contain a `section` key
- **THEN** the CLI SHALL reject the plan with an error identifying the missing key
