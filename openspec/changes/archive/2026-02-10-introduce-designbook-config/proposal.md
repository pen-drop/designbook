# Proposal: Introduce Designbook Configuration

## Why
Currently, Designbook skills and workflows assume a default directory structure or require hardcoded paths (e.g., `packages/integrations/test-integration-drupal/designbook`). This creates friction when working in different environments (e.g., integration tests vs. real projects) and violates the principle of separation of concerns.

A configuration file is needed to explicitly define where Designbook artifacts should be stored, ensuring all tools operate on the correct files.

## What Changes
- Introduce `designbook.config.yml` in the project root.
- Define a `technology` setting (e.g., `drupal`) to determine which skills/logic to load.
- Define a `dist` setting to specify the folder where Designbook assets should be saved.
- Define a `tmp` setting to specify the temporary folder (defaults to `tmp` or similar).
- Implement a mechanism for skills to access these values (e.g., environment variables `DESIGNBOOK_DIST`, `DESIGNBOOK_TMP`).

## Capabilities

### New Capabilities
- `designbook-configuration`: Defines the schema for `designbook.config.yml` and the standard way for skills/workflows to load it.

### Modified Capabilities
- **ALL** `designbook-*` skills: Update to use the configuration for resolving file paths and technology-specific logic.
- **ALL** `/debo-*` workflows: Update to use the configuration for resolving file paths and technology-specific logic.

## Impact
- **Agent Skills**: `designbook-data-model`, `designbook-tokens`, etc. need logic to find and parse the config.
- **Workflows**: User-facing commands will be more robust across different repo structures.
