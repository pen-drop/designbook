# Design: Designbook Configuration

## Context
Designbook artifacts (data models, tokens, products) need to be stored in specific locations depending on the environment (e.g., project root vs. integration test package). Currently, these paths are hardcoded or assumed, leading to fragility.

We are introducing a centralized configuration file, `designbook.config.yml`, to define these paths.

## Design Decisions

### Configuration File Format
We will use **YAML** (`designbook.config.yml`) for the configuration file.
- **Why**: YAML is standard for configuration in this ecosystem, easy to read/write, and supports comments.
- **Location**: Project root (git root).

### Schema
The configuration will support the following keys:
```yaml
# designbook.config.yml

# The target technology stack (e.g., "drupal", "react").
# Critical for determining which skills to load and how to generate code.
technology: "drupal"

# The destination folder where Designbook assets (data models, tokens, etc.) will be saved.
dist: "packages/integrations/test-integration-drupal/designbook"

# The temporary directory for intermediate files.
# Defaults to "tmp" if not specified.
tmp: "tmp"
```

### Loading Mechanism
We will create a lightweight Node.js utility script (or module) that skills can use to:
1.  Find `designbook.config.yml` by walking up the directory tree or checking the root.
2.  Parse the YAML content.
3.  Inject these values into the environment or return them as an object.

For Bash-based steps, we'll provide a helper that exports these as environment variables:
- `DESIGNBOOK_TECHNOLOGY` -> matches `technology`
- `DESIGNBOOK_DIST` -> matches `dist`
- `DESIGNBOOK_TMP` -> matches `tmp`

## Alternatives Considered
- **Environment Variables**: Too ephemeral, hard to share across team.
- **JSON**: No comments, less readable for config.
- **Code (JS/TS)**: Overkill for simple path configuration, requires execution.

## Implementation Details
- **New Skill**: `designbook-configuration`
    - `scripts/load-config.cjs`: Reads config and outputs JSON.
    - `scripts/env-config.sh`: Sourced by other scripts to set ENV vars.
- **Integration**:
    - Update **ALL** `designbook-*` skills to source `env-config.sh` or use `load-config.js`.
    - Update **ALL** `/debo-*` workflows to reference valid config paths.
