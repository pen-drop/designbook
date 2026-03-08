## ADDED Requirements

### Requirement: Shared config resolver module
The addon package SHALL export a `findConfig(startDir?)` function and a `loadConfig(startDir?)` function from a dedicated `config` module.

#### Scenario: Module is importable from addon package
- **WHEN** a consumer imports from `@designbook/storybook-addon-designbook/config`
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
- **WHEN** a config file contains `dist`, `technology`, and `tmp` keys
- **THEN** `loadConfig()` SHALL return their values

#### Scenario: Missing keys use defaults
- **WHEN** a config file does not contain `dist`
- **THEN** `loadConfig()` SHALL return `dist: "designbook"` as default
- **AND** `technology` SHALL default to `"html"`
- **AND** `tmp` SHALL default to `"tmp"`

### Requirement: Dist path resolution relative to config location
The `loadConfig` function SHALL resolve the `dist` path relative to the directory containing the config file, not relative to `cwd()`.

#### Scenario: Workspace-local config with relative dist
- **WHEN** config file is at `/project/promptfoo/workspaces/test-1/designbook.config.yml`
- **AND** config contains `dist: ./designbook`
- **THEN** the resolved dist path SHALL be `/project/promptfoo/workspaces/test-1/designbook`

## MODIFIED Requirements

### Requirement: Categorized directory layout
All promptfoo configuration files SHALL reside under a top-level `promptfoo/` directory. Test suites SHALL be organized into `skills/` (single skill tests) and `workflows/` (multi-skill orchestration tests) subdirectories. Each test suite SHALL contain a `promptfooconfig.yaml` and a `prompts/` folder.

#### Scenario: Directory structure exists
- **WHEN** the restructuring is complete
- **THEN** the directory `promptfoo/workflows/debo-design-screen/` SHALL exist with `promptfooconfig.yaml` and `prompts/` subdirectory
- **AND** the directory `promptfoo/skills/` SHALL exist for skill-level tests

#### Scenario: No promptfoo files in root
- **WHEN** the restructuring is complete
- **THEN** `promptfooconfig.yaml`, `promptfoo-test-blog.yaml`, `blog_prompt.txt`, `verify_blog_spec.py`, and `README_promptfoo.md` SHALL NOT exist in the project root
