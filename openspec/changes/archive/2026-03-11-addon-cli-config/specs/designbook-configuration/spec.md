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
