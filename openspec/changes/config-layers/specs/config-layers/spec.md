## ADDED Requirements

### Requirement: workspace config key
`designbook.config.yml` MAY declare a top-level `workspace` key. It is a path to the git project root, resolved relative to the config file location. When absent, it defaults to the directory containing `designbook.config.yml`. Exposed as `DESIGNBOOK_WORKSPACE`.

#### Scenario: workspace defaults to config dir
- **WHEN** `designbook.config.yml` has no `workspace` key
- **THEN** `DESIGNBOOK_WORKSPACE` SHALL be the absolute path to the directory containing `designbook.config.yml`

#### Scenario: workspace resolved relative to config file
- **WHEN** `designbook.config.yml` declares `workspace: ../..`
- **THEN** `DESIGNBOOK_WORKSPACE` SHALL be resolved as an absolute path relative to the config file location

### Requirement: designbook config section
`designbook.config.yml` MAY declare a nested `designbook:` section with the following keys:
- `home` — path to the Storybook/theme app dir; resolved relative to `workspace`; defaults to `workspace`
- `data` — name of the data directory relative to `home`; defaults to `designbook`
- `url` — URL of the running Storybook preview
- `cmd` — shell command to start Storybook

Exposed as `DESIGNBOOK_HOME`, `DESIGNBOOK_DATA`, `DESIGNBOOK_URL`, `DESIGNBOOK_CMD`.

#### Scenario: designbook.home resolved relative to workspace
- **WHEN** `workspace: .` and `designbook.home: web/themes/custom/my_theme`
- **THEN** `DESIGNBOOK_HOME` SHALL be `resolve(workspace, 'web/themes/custom/my_theme')`

#### Scenario: designbook.home defaults to workspace
- **WHEN** `designbook.home` is absent
- **THEN** `DESIGNBOOK_HOME` SHALL equal `DESIGNBOOK_WORKSPACE`

#### Scenario: designbook.data resolved as subdir of home
- **WHEN** `designbook.data: designbook`
- **THEN** `DESIGNBOOK_DATA` SHALL be `resolve(DESIGNBOOK_HOME, 'designbook')`

#### Scenario: designbook.data defaults to "designbook"
- **WHEN** `designbook.data` is absent
- **THEN** `DESIGNBOOK_DATA` SHALL be `resolve(DESIGNBOOK_HOME, 'designbook')`

### Requirement: dirs config section
`designbook.config.yml` MAY declare a `dirs:` section. Each key is a short name for a project directory (e.g. `components`, `css`, `config`, `templates`). Each value is a plain string directory path resolved relative to `workspace`. Exposed as `DESIGNBOOK_DIRS_<KEY>` (uppercased key).

Dir values MUST be plain strings (directory paths). No nested objects are allowed under `dirs.*`.

#### Scenario: dir paths resolved relative to workspace
- **WHEN** `workspace: .` and `dirs.components: web/themes/custom/my_theme/components`
- **THEN** `DESIGNBOOK_DIRS_COMPONENTS` SHALL be `resolve(workspace, 'web/themes/custom/my_theme/components')`

#### Scenario: dir outside home dir is valid
- **WHEN** `dirs.templates: templates` and templates is not under `designbook.home`
- **THEN** `DESIGNBOOK_DIRS_TEMPLATES` SHALL still be resolved relative to `workspace`

#### Scenario: unknown dir keys are passed through
- **WHEN** `dirs.icons: icons`
- **THEN** `DESIGNBOOK_DIRS_ICONS` SHALL be set to the resolved absolute path

### Requirement: worktree default path under DESIGNBOOK_DATA
When `workflow plan` creates a git worktree and no `DESIGNBOOK_WORKSPACES` env override is set, the worktree path SHALL default to `DESIGNBOOK_DATA/workspaces/<workflow-name>`.

#### Scenario: worktree created under data/workspaces
- **WHEN** `DESIGNBOOK_WORKSPACES` is not set
- **THEN** the worktree path SHALL be `resolve(DESIGNBOOK_DATA, 'workspaces', workflowName)`

#### Scenario: worktree path overridable via env var
- **WHEN** `DESIGNBOOK_WORKSPACES=/custom/path` is set
- **THEN** the worktree path SHALL be `resolve('/custom/path', workflowName)`
