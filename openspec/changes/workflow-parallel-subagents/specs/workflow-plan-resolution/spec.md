## ADDED Requirements

### Requirement: workflow plan resolves task files from workflow-file and items

`workflow plan` SHALL accept `--workflow-file <path>` and `--items <json>` and resolve task files, file paths, dependencies, and rule files automatically.

#### Scenario: CLI reads stages from workflow-file frontmatter
- **WHEN** `workflow plan --workflow-file .agents/workflows/debo-design-screen.md` is called
- **THEN** the CLI parses the YAML frontmatter and extracts the `workflow.stages` array, skipping any stage ending in `:intake`

#### Scenario: Task file resolved per item via stage name
- **WHEN** an item has `"stage": "create-component"`
- **THEN** the CLI scans `.agents/skills/*/tasks/create-component.md`, applies `when` condition filtering against `designbook.config.yml`, and selects the most specific match (most `when` conditions that all pass)

#### Scenario: Named stage resolution (skill:task format)
- **WHEN** an item has `"stage": "designbook-sections:create-section"`
- **THEN** the CLI resolves directly to `.agents/skills/designbook-sections/tasks/create-section.md` without scanning

#### Scenario: File path templates expanded with params and env vars
- **WHEN** a resolved task file declares `files: ["${DESIGNBOOK_DRUPAL_THEME}/components/{{ component }}/{{ component }}.component.yml"]`
- **THEN** the CLI expands `${DESIGNBOOK_DRUPAL_THEME}` from config and `{{ component }}` from the item's params

#### Scenario: Task ID generated from stage and params
- **WHEN** an item has `"stage": "create-component"` and `"params": {"component": "button"}`
- **THEN** the generated task ID is `create-component-button`

#### Scenario: No matching task file found
- **WHEN** no task file matches the item's stage name and config conditions
- **THEN** the CLI exits with error listing the stage name and config values checked

### Requirement: workflow plan computes depends_on from stage ordering

`workflow plan` SHALL automatically compute `depends_on` for each task based on the stage ordering declared in the workflow-file.

#### Scenario: First-stage tasks have empty depends_on
- **WHEN** tasks belong to the first non-intake stage in the stages array
- **THEN** their `depends_on` is `[]`

#### Scenario: Later-stage tasks depend on all previous-stage tasks
- **WHEN** a task belongs to stage index N (N > 0)
- **THEN** its `depends_on` contains the IDs of all tasks in stage index N-1

#### Scenario: Multiple tasks in same stage are parallel
- **WHEN** two tasks both belong to stage `create-component`
- **THEN** they have identical `depends_on` arrays and can run in parallel

### Requirement: workflow plan matches rule files per stage

`workflow plan` SHALL scan `.agents/skills/*/rules/*.md` frontmatter and store matched rule file paths per task.

#### Scenario: Rule file matched by stage
- **WHEN** a rule file has `when.stages: [create-component]` and a task has stage `create-component`
- **THEN** the rule file path is included in the task's `rules` array

#### Scenario: Rule file matched by config condition
- **WHEN** a rule file has `when: { "frameworks.css": "daisyui" }` and config has `frameworks.css: daisyui`
- **THEN** the rule file path is included for all tasks whose stage matches (or rule has no `when.stages`)

#### Scenario: Rule file without when.stages applies to all stages
- **WHEN** a rule file has `when: {}` (no stages constraint)
- **THEN** it is included in the `rules` array of every task (if other when conditions pass)

### Requirement: workflow plan resolves config rules and instructions per stage

`workflow plan` SHALL read `designbook.config.yml` → `workflow.rules.<stage>` and `workflow.tasks.<stage>` and store them per task.

#### Scenario: Config rules resolved for stage
- **WHEN** `designbook.config.yml` contains `workflow.rules.create-component: ["Komponenten-Namen immer auf Englisch"]`
- **THEN** each task with stage `create-component` gets `config_rules: ["Komponenten-Namen immer auf Englisch"]`

#### Scenario: Config task instructions resolved for stage
- **WHEN** `designbook.config.yml` contains `workflow.tasks.create-component: ["Nach Erstellung prüfen ob die Komponente im Storybook ohne Fehler rendert"]`
- **THEN** each task with stage `create-component` gets `config_instructions: ["Nach Erstellung prüfen ob die Komponente im Storybook ohne Fehler rendert"]`

#### Scenario: Named intake stage config keys match
- **WHEN** `designbook.config.yml` contains `workflow.rules.designbook-data-model:intake: [...]`
- **THEN** tasks with stage `designbook-data-model:intake` get those config rules

#### Scenario: No config entries for stage
- **WHEN** `designbook.config.yml` has no `workflow.rules.<stage>` or `workflow.tasks.<stage>`
- **THEN** the task gets `config_rules: []` and `config_instructions: []`

### Requirement: workflow plan accepts global params

`workflow plan` SHALL accept `--params <json>` for global intake context, stored at the top level of tasks.yml.

#### Scenario: Global params written to tasks.yml
- **WHEN** `workflow plan --params '{"section_id": "dashboard"}'` is called
- **THEN** tasks.yml contains a top-level `params:` key with the deserialized object

#### Scenario: Global params absent is valid
- **WHEN** `workflow plan` is called without `--params`
- **THEN** no `params` key is written at the top level

### Requirement: workflow plan validates item params against task file schema

`workflow plan` SHALL validate each item's params against the matched task file's `params:` frontmatter declaration.

#### Scenario: Required param missing
- **WHEN** a task file declares `params: { component: ~ }` (required) and the item has no `component` param
- **THEN** the CLI exits with error: "Missing required param 'component' for stage 'create-component'"

#### Scenario: Optional param absent
- **WHEN** a task file declares `params: { slots: [] }` (optional with default) and the item has no `slots` param
- **THEN** the CLI uses the default value `[]`

### Requirement: workflow plan outputs resolved plan as JSON

`workflow plan` SHALL output the fully-resolved plan to stdout as JSON after writing tasks.yml.

#### Scenario: JSON output contains all resolved data
- **WHEN** `workflow plan` completes
- **THEN** stdout contains JSON with: `tasks` array (each with `id`, `title`, `type`, `stage`, `task_file`, `params`, `depends_on`, `rules`, `files`), and top-level `params`
