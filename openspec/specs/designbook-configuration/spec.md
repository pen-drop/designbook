# Spec: Designbook Configuration

## Goal
Establish a standard way to configure Designbook paths across the project using `designbook.config.yml`.

## Requirements

### Configuration File
- **Filename**: `designbook.config.yml`
- **Location**: Project root.
- **Format**: YAML.

### Supported Keys
- `technology`: (String, Required) Target technology stack (e.g., `drupal`, `react`). Used to control skill loading/logic.
- `dist`: (String, Required) Path to the Directory for saving Designbook output.
- `tmp`: (String, Optional) Path to the temporary directory. Default: `tmp`.

### Loading Utility
A script MUST be provided to load this configuration.
- **Script**: `.agent/skills/designbook-configuration/scripts/load-config.js`
- **Output**: JSON string of the configuration object.
- **Error Handling**: verified valid YAML, returns defaults if file missing.

### Environment Helper
A shell helper MUST be provided for Bash scripts.
- **Script**: `.agent/skills/designbook-configuration/scripts/set-env.sh`
- **Usage**: `source .agent/skills/designbook-configuration/scripts/set-env.sh`
- **Effect**: Sets `DESIGNBOOK_TECHNOLOGY`, `DESIGNBOOK_DIST`, and `DESIGNBOOK_TMP` environment variables.
