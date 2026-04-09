## MODIFIED Requirements

### Requirement: workflow plan resolves task files from workflow-file and items

`workflow plan` SHALL accept `--workflow-file <path>` and `--items <json>` and resolve task files, file paths, dependencies, rule files, and WORKTREE paths automatically.

#### Scenario: CLI reads stages from workflow-file frontmatter
- **WHEN** `workflow plan --workflow-file .agents/workflows/debo-design-screen.md` is called
- **THEN** the CLI parses the YAML frontmatter and extracts the `workflow.stages` array, skipping any stage ending in `:intake`

#### Scenario: Task file resolved per item via stage name
- **WHEN** an item has `"stage": "create-component"`
- **THEN** the CLI scans `.agents/skills/**/tasks/create-component.md` via `resolveFiles`, applies `when` condition filtering against runtime context (empty for tasks) and enriched config, and selects the most specific match (highest specificity count)

#### Scenario: Named stage resolution (skill:task format)
- **WHEN** an item has `"stage": "designbook-sections:create-section"`
- **THEN** the CLI resolves directly to `.agents/skills/designbook-sections/tasks/create-section.md` without scanning

#### Scenario: File path templates expanded then stored as relative path
- **WHEN** a resolved task file declares `files: ["${DESIGNBOOK_DRUPAL_THEME}/components/{{ component }}/{{ component }}.component.yml"]`
- **THEN** the CLI expands `${DESIGNBOOK_DRUPAL_THEME}` from config and `{{ component }}` from the item's params, then strips the `DESIGNBOOK_ROOT` prefix to produce a relative path (e.g., `components/button/button.component.yml`)

#### Scenario: files: entry written with id and relative path
- **WHEN** path expansion completes for a file
- **THEN** `tasks.yml` stores the entry as `{id: <derived-id>, path: <relative-path>}` where path is relative to `DESIGNBOOK_ROOT`

#### Scenario: WORKTREE directory created at plan time
- **WHEN** `workflow plan` runs
- **THEN** the directory `/tmp/designbook-[workflow-id]/` is created and its path is stored in `tasks.yml` under `write_root`

#### Scenario: Task ID generated from stage and params
- **WHEN** an item has `"stage": "create-component"` and `"params": {"component": "button"}`
- **THEN** the generated task ID is `create-component-button`

#### Scenario: No matching task file found
- **WHEN** no task file matches the item's stage name and config conditions
- **THEN** the CLI exits with error listing the stage name and config values checked
