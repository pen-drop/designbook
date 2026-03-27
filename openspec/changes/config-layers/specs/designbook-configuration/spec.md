## MODIFIED Requirements

### Requirement: Environment Helper
A shell helper MUST be provided for Bash scripts.
- **Usage**: `eval "$(npx storybook-addon-designbook config)"`
- **Effect**: Sets `DESIGNBOOK_BACKEND`, `DESIGNBOOK_FRAMEWORK_COMPONENT`, `DESIGNBOOK_FRAMEWORK_CSS`, `DESIGNBOOK_DATA`, `DESIGNBOOK_TMP`, `DESIGNBOOK_WORKSPACE`, `DESIGNBOOK_HOME`, `DESIGNBOOK_DIRS_*`, `DESIGNBOOK_SDC_PROVIDER`, `DESIGNBOOK_EXTENSIONS`, and `DESIGNBOOK_EXTENSION_SKILLS` environment variables.

#### Scenario: Environment variables are set via CLI
- **WHEN** a bash script runs `eval "$(npx storybook-addon-designbook config)"`
- **THEN** `DESIGNBOOK_WORKSPACE`, `DESIGNBOOK_HOME`, `DESIGNBOOK_DATA` SHALL be set
- **AND** `DESIGNBOOK_DIRS_*` SHALL be set for each key declared in `dirs:`
