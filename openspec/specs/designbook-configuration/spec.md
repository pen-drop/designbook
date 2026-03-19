## MODIFIED Requirements

### Requirement: Loading Utility
A script MUST be provided to load this configuration.
- **Script**: `.agent/skills/designbook-configuration/scripts/load-config.cjs`
- **Import**: `require('storybook-addon-designbook/config')`
- **Output**: JSON string of the configuration object.
- **Error Handling**: verified valid YAML, returns defaults if file missing.

#### Scenario: Load config via package import
- **WHEN** `load-config.cjs` is executed
- **THEN** it imports `loadConfig` from `storybook-addon-designbook/config` without filesystem fallback paths

### Requirement: Environment Helper
A shell helper MUST be provided for Bash scripts.
- **Usage**: `eval "$(npx storybook-addon-designbook config)"`
- **Effect**: Sets `DESIGNBOOK_BACKEND`, `DESIGNBOOK_FRAMEWORK_COMPONENT`, `DESIGNBOOK_FRAMEWORK_CSS`, `DESIGNBOOK_DIST`, `DESIGNBOOK_TMP`, `DESIGNBOOK_DRUPAL_THEME`, and `DESIGNBOOK_SDC_PROVIDER` environment variables.

#### Scenario: Environment variables are set via CLI
- **WHEN** a bash script runs `eval "$(npx storybook-addon-designbook config)"`
- **THEN** all `DESIGNBOOK_*` environment variables are available in the shell session

## ADDED Requirements

### Requirement: Workflow Rules in Config
The `designbook.config.yml` file MAY include a `workflow.rules` map. Each key is a stage name (e.g. `create-component`, `debo-design-component:dialog`). Each value is an array of strings. These strings are treated as additional constraints applied silently during that stage — additive to any skill rule files that also match the stage.

```yaml
workflow:
  rules:
    create-component:
      - "All interactive elements require ARIA labels"
    debo-design-component:dialog:
      - "Always ask for the client's Figma link"
```

#### Scenario: Config rules applied during stage
- **WHEN** the AI executes a stage (e.g. `create-component`)
- **THEN** it reads `designbook.config.yml` → `workflow.rules.create-component` and applies each string as a constraint alongside skill rule files

#### Scenario: Workflow-scoped dialog rules applied
- **WHEN** the AI executes the dialog stage of `debo-design-component`
- **THEN** it reads `workflow.rules["debo-design-component:dialog"]` and applies those constraints during the dialog

#### Scenario: No workflow key in config
- **WHEN** `designbook.config.yml` has no `workflow:` key
- **THEN** no config rules are applied; skill rules apply as normal

### Requirement: Workflow Tasks in Config
The `designbook.config.yml` file MAY include a `workflow.tasks` map. Each key is a stage name. Each value is an array of strings. These strings are appended as additional instructions to the task file content for that stage — they do not replace task files and do not declare files for `workflow plan`.

```yaml
workflow:
  tasks:
    create-component:
      - "After creation, verify the component renders in Storybook"
    create-tokens:
      - "Export final token names to TOKENS.md"
```

#### Scenario: Config task instructions appended during stage
- **WHEN** the AI executes tasks for a stage (e.g. `create-component`)
- **THEN** it reads `designbook.config.yml` → `workflow.tasks.create-component` and appends each string as additional instructions to the task file content

#### Scenario: Config tasks are additive only
- **WHEN** both a skill task file and config tasks exist for the same stage
- **THEN** both apply — config strings are appended, skill task file is not replaced
