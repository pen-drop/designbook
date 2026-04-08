# config-walk-up Specification

## Purpose
Centralizes `designbook.config.yml` discovery and loading into a shared module with walk-up directory traversal, enabling workspace-local config resolution for test isolation.

## Requirements

### Requirement: Shared config resolver module
The addon package SHALL export a `findConfig(startDir?)` function and a `loadConfig(startDir?)` function from a dedicated `config` module.

#### Scenario: Module is importable from addon package
- **WHEN** a consumer imports from `storybook-addon-designbook/config`
- **THEN** the exported module SHALL provide `findConfig` and `loadConfig` functions

### Requirement: Walk-up directory traversal
The `findConfig` function SHALL search for `designbook.config.yml` (or `.yaml`) starting from the given directory (defaulting to `process.cwd()`) and walking up parent directories until the filesystem root.

#### Scenario: Config in current directory
- **WHEN** `designbook.config.yml` exists in the start directory
- **THEN** `findConfig()` SHALL return the absolute path to that file

#### Scenario: Config in parent directory
- **WHEN** `designbook.config.yml` does NOT exist in the start directory
- **AND** `designbook.config.yml` exists in an ancestor directory
- **THEN** `findConfig()` SHALL return the absolute path to the ancestor's config file

#### Scenario: No config found
- **WHEN** no `designbook.config.yml` exists in any ancestor directory up to the filesystem root
- **THEN** `findConfig()` SHALL return `null`

#### Scenario: YAML extension variant
- **WHEN** `designbook.config.yaml` exists but `designbook.config.yml` does not
- **THEN** `findConfig()` SHALL return the `.yaml` variant

### Requirement: Config loading with defaults
The `loadConfig` function SHALL parse the found config file and return a config object with defaults applied for missing keys.

#### Scenario: All keys present
- **WHEN** a config file contains `technology`, `workspace`, `designbook.home`, and `designbook.data` keys
- **THEN** `loadConfig()` SHALL return their resolved values

#### Scenario: Missing keys use defaults
- **WHEN** a config file does not contain `technology`
- **THEN** `loadConfig()` SHALL default `technology` to `"html"`
- **AND** when no config file is found, `data` SHALL default to `resolve(cwd, "designbook")`

### Requirement: Path resolution hierarchy
The `loadConfig` function SHALL resolve paths in a layered hierarchy relative to the config file location:
1. `workspace` -- resolved relative to the config directory; defaults to the config directory itself
2. `designbook.home` -- resolved relative to the config directory; defaults to the workspace directory
3. `designbook.data` -- resolved relative to `designbook.home` as `home/<name>`; defaults to `home/designbook`
4. `dirs.*` -- resolved relative to the config directory

#### Scenario: Workspace-local config with relative paths
- **WHEN** config file is at `/project/workspaces/test-1/designbook.config.yml`
- **AND** config contains `workspace: .` and `designbook: { data: designbook }`
- **THEN** the resolved workspace SHALL be `/project/workspaces/test-1`
- **AND** the resolved data path SHALL be `/project/workspaces/test-1/designbook`

#### Scenario: No config file found
- **WHEN** no config file exists in any ancestor directory
- **THEN** `loadConfig()` SHALL return defaults with `workspace` set to `cwd`, `designbook.home` set to `cwd`, and `designbook.data` set to `resolve(cwd, "designbook")`
