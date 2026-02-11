# Delta Spec: Update Strategies for Config Awareness

## Goal
Update existing skills and workflows to respect the paths defined in `designbook.config.yml`.

## Requirements

### Skill Updates
**ALL** `designbook-*` skills MUST be updated to source the configuration before running their logic.
Specific skills known to need updates:
- `designbook-data-model`
- `designbook-tokens`
- `designbook-theme` (if exists)
- `designbook-components`
- `designbook-figma-*` family (if they write files)

### Logic Change
- **Before**: Hardcoded paths like `designbook/data-model.json`.
- **After**: Use `path.join(process.env.DESIGNBOOK_DIST, 'data-model.json')`.
- **Before**: Generic behavior.
- **After**: Check `process.env.DESIGNBOOK_TECHNOLOGY` to determine which generation logic to run (e.g., if `drupal`, generate `.yml` files).

### Workflow Updates
- **ALL** `/debo-*` workflows MUST use the configuration-aware path.
- Workflows should instruct the Agent to "Check `designbook.config.yml` configuration" when deciding where to look for files.
