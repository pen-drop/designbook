## MODIFIED Requirements

### Requirement: workflow plan resolves task files from workflow-file and items

`workflow plan` SHALL accept `--workflow-file <path>` and `--items <json>` and resolve task files, file paths, dependencies, and rule files automatically.

#### Scenario: CLI reads stages from workflow-file frontmatter
- **WHEN** `workflow plan --workflow-file .agents/workflows/debo-design-screen.md` is called
- **THEN** the CLI parses the YAML frontmatter and extracts the `workflow.stages` array, skipping any stage ending in `:intake`

#### Scenario: Task file resolved per item via stage name
- **WHEN** an item has `"stage": "create-component"`
- **THEN** the CLI scans `.agents/skills/**/tasks/create-component.md` via `resolveFiles`, applies `when` condition filtering against runtime context (empty for tasks) and enriched config, and selects the most specific match (highest specificity count)

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

## ADDED Requirements

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
