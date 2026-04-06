# workflow-plan-resolution Specification

## Purpose
Defines how `workflow plan` resolves task files, file paths, dependencies, rules, and config constraints at plan time — so subagents receive fully-resolved tasks without needing to scan skill directories.

---
## Requirements
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

---

### Requirement: depends_on removed from resolved tasks

Resolved tasks SHALL NOT contain `depends_on` arrays. Execution order is determined by stage ordering: all tasks in step N complete before step N+1 begins.

#### Scenario: Execution order from stages
- **WHEN** workflow declares steps `[generate-jsonata, generate-css]`
- **AND** `generate-jsonata` resolves to two parallel tasks
- **THEN** neither task has a `depends_on` field
- **AND** the orchestrator runs both before proceeding to `generate-css`

---

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

---

### Requirement: workflow plan resolves config rules and instructions per stage

`workflow plan` SHALL read `designbook.config.yml` -> `workflow.rules.<stage>` and `workflow.tasks.<stage>` and store them per task.

#### Scenario: Config rules resolved for stage
- **WHEN** `designbook.config.yml` contains `workflow.rules.create-component: ["Rule string"]`
- **THEN** each task with stage `create-component` gets `config_rules: ["Rule string"]`

#### Scenario: Config task instructions resolved for stage
- **WHEN** `designbook.config.yml` contains `workflow.tasks.create-component: ["Instruction string"]`
- **THEN** each task with stage `create-component` gets `config_instructions: ["Instruction string"]`

#### Scenario: No config entries for stage
- **WHEN** `designbook.config.yml` has no `workflow.rules.<stage>` or `workflow.tasks.<stage>`
- **THEN** the task gets `config_rules: []` and `config_instructions: []`

---

### Requirement: workflow plan accepts global params

`workflow plan` SHALL accept `--params <json>` for global intake context, stored at the top level of tasks.yml.

#### Scenario: Global params written to tasks.yml
- **WHEN** `workflow plan --params '{"section_id": "dashboard"}'` is called
- **THEN** tasks.yml contains a top-level `params:` key with the deserialized object

#### Scenario: Global params absent is valid
- **WHEN** `workflow plan` is called without `--params`
- **THEN** no `params` key is written at the top level

---

### Requirement: workflow plan validates item params against task file schema

`workflow plan` SHALL validate each item's params against the matched task file's `params:` frontmatter declaration.

#### Scenario: Required param missing
- **WHEN** a task file declares `params: { component: ~ }` (required) and the item has no `component` param
- **THEN** the CLI exits with error: "Missing required param 'component' for stage 'create-component'"

#### Scenario: Optional param absent
- **WHEN** a task file declares `params: { slots: [] }` (optional with default) and the item has no `slots` param
- **THEN** the CLI uses the default value `[]`

---

### Requirement: workflow plan outputs resolved plan as JSON

`workflow plan` SHALL output the fully-resolved plan to stdout as JSON after writing tasks.yml.

#### Scenario: JSON output contains all resolved data
- **WHEN** `workflow plan` completes
- **THEN** stdout contains JSON with: `tasks` array (each with `id`, `title`, `type`, `stage`, `task_file`, `params`, `depends_on`, `rules`, `files`), and top-level `params`

---

### Requirement: when conditions use two-source lookup (context then config)

The `checkWhen` function SHALL resolve each `when` key by looking up context first, then config as fallback. Context contains runtime values (current stage, extra conditions). Config contains project configuration enriched with DESIGNBOOK_* env vars and normalized extensions.

#### Scenario: Context key takes precedence over config key
- **WHEN** a `when` block has `stages: [create-scene]` and context has `stages: 'create-scene'` and config also has `stages: 'other'`
- **THEN** the match succeeds because context is checked first

#### Scenario: Config flat key used as fallback
- **WHEN** a `when` block has `frameworks.css: tailwind` and context has no such key
- **THEN** the value is resolved from config's flat key `frameworks.css`

#### Scenario: Config dot-path traversal as last resort
- **WHEN** a `when` block has `frameworks.css: tailwind` and config has no flat `frameworks.css` key but has `{ frameworks: { css: 'tailwind' } }`
- **THEN** the value is resolved via dot-path traversal into the nested config

#### Scenario: Array inclusion check for extensions
- **WHEN** a `when` block has `extensions: canvas` and config has `extensions: ['canvas', 'drupal']`
- **THEN** the match succeeds because `'canvas'` is found in the config array

### Requirement: checkWhen returns specificity count

`checkWhen` SHALL return the number of matched `when` keys on success, or `false` if any condition fails.

#### Scenario: All conditions match
- **WHEN** a `when` block has 3 keys and all match against context/config
- **THEN** `checkWhen` returns `3`

#### Scenario: Any condition fails
- **WHEN** a `when` block has `frameworks.css: daisyui` but config has `frameworks.css: tailwind`
- **THEN** `checkWhen` returns `false`

#### Scenario: Empty when block
- **WHEN** a file has no `when` block or an empty `when: {}`
- **THEN** the file matches unconditionally with specificity `0`

### Requirement: resolveFiles provides unified glob-and-filter

`resolveFiles` SHALL glob for markdown files, parse frontmatter, and filter by `when` conditions against context and config.

#### Scenario: Glob finds files and filters by when
- **WHEN** `resolveFiles('skills/**/rules/*.md', context, config, agentsDir)` is called
- **THEN** all `.md` files matching the glob are scanned, and only those whose `when` conditions pass are returned

#### Scenario: Return includes specificity and frontmatter
- **WHEN** a file matches with 2 `when` conditions
- **THEN** the returned `ResolvedFile` has `specificity: 2` and the parsed `frontmatter`

### Requirement: workflow plan matches blueprint files per stage

`workflow plan` SHALL scan `.agents/skills/*/blueprints/*.md` frontmatter and store matched blueprint file paths per task, using the same `when` condition matching as rules.

#### Scenario: Blueprint file matched by step
- **WHEN** a blueprint file has `when.steps: [map-entity]` and a task has step `map-entity`
- **THEN** the blueprint file path is included in the task's `blueprints` array

#### Scenario: Blueprint file matched by config condition
- **WHEN** a blueprint file has `when: { backend: drupal }` and config has `DESIGNBOOK_BACKEND: drupal`
- **THEN** the blueprint file path is included for all tasks whose step matches

#### Scenario: Scanned blueprints merged with declared blueprints
- **WHEN** a workflow's frontmatter declares blueprints for a stage (e.g., intake declares `section.md`)
- **AND** additional blueprint files match the stage via `when.steps` scanning
- **THEN** both sources are merged into the task's `blueprints` array, deduplicated by absolute path

#### Scenario: Frontmatter blueprints take precedence
- **WHEN** a blueprint is declared in both frontmatter and matched by scanning
- **THEN** only one entry appears in `blueprints[]` (deduplicated)

#### Scenario: Data-mapping blueprints loaded for map-entity
- **WHEN** `map-entity` stage resolves tasks
- **AND** `designbook-drupal/data-mapping/blueprints/canvas.md` has `when.steps: [map-entity]`
- **THEN** `canvas.md` appears in the task's `blueprints` array alongside `field-map.md`, `layout-builder.md`, and `views.md`

