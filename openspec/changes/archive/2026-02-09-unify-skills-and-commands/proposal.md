
## Why

The current project structure splits agent capabilities between `.agent` and `.cursor` directories with inconsistent naming conventions. This fragmentation makes it difficult to maintain and discover available tools. Unifying skills and commands into a single `agents` directory with a standardized naming convention will improve developer experience and maintainability.

## What Changes

- **Consolidate Directories**: Move all skills and commands into a new top-level `agents/` directory.
- **Standardize Skill Naming**: Rename all skills to start with `designbook-`.
  - Figma-related skills: `designbook-figma-*`
  - Integration-specific skills: `designbook-figma-drupal-*`
- **Standardize Command Naming**: Rename all commands to start with `debo-`.
- **Refactor Commands**: Ensure commands strictly call skills and do not contain logic themselves.
- **Symlink Setup**: Update `.cursor` directory to contain symlinks pointing to the new `agents/` location for IDE integration.

## Capabilities

### New Capabilities
- `agent-architecture`: Defines the standard structure, naming conventions, and organization for agent skills and commands.

### Modified Capabilities
<!-- None, as this is a structural reorganization rather than a functional change to existing product features. -->

## Impact

- **Developer Workflow**: Developers will access tools via new `debo-*` commands.
- **IDE Integration**: `.cursor/` configuration will be updated to point to the new locations.
- **Existing Scripts**: Any scripts relying on old paths or command names will need updating.
