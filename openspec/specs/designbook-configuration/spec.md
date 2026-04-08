# Designbook Configuration

## Purpose
Define how `designbook.config.yml` is loaded and exposed as environment variables. Config loading lives in `packages/storybook-addon-designbook/src/config.ts`, importable as `storybook-addon-designbook/config`.

## Requirements

### Requirement: Loading Utility

Module `storybook-addon-designbook/config` SHALL provide `findConfig(startDir?)` and `loadConfig(startDir?)`. Returns parsed config with defaults applied and paths resolved. Returns defaults if no config file found; throws on invalid YAML.

#### Scenario: Load config via package import
- **WHEN** importing `loadConfig` → finds and parses `designbook.config.yml` via walk-up traversal, returns `DesignbookConfig` with resolved paths

### Requirement: Environment Helper

`eval "$(npx storybook-addon-designbook config)"` SHALL set environment variables from resolved config:

`DESIGNBOOK_TECHNOLOGY`, `DESIGNBOOK_WORKSPACE`, `DESIGNBOOK_HOME`, `DESIGNBOOK_DATA`, `DESIGNBOOK_URL`, `DESIGNBOOK_CMD` (also defines shell function), `DESIGNBOOK_FRAMEWORK_COMPONENT`, `DESIGNBOOK_FRAMEWORK_CSS`, `DESIGNBOOK_DIRS_*` (resolved to absolute paths), `DESIGNBOOK_COMPONENT_NAMESPACE`, `DESIGNBOOK_COMPONENT_SRC`, `DESIGNBOOK_EXTENSIONS` (comma-separated IDs), `DESIGNBOOK_EXTENSION_SKILLS` (comma-separated skill IDs)

#### Scenario: Dotted keys become underscored env vars
- **WHEN** config contains `frameworks.css: tailwind` → output `export DESIGNBOOK_FRAMEWORK_CSS='tailwind'` (note: `frameworks` renamed to `FRAMEWORK` singular)

### Requirement: Config key flattening

Nested YAML keys SHALL be recursively flattened into dot-separated paths. Arrays (like `extensions`) are preserved as-is.

#### Scenario: Nested keys are flattened
- **WHEN** `dirs: { components: components, css: { tokens: css/tokens } }` → config contains `dirs.components` and `dirs.css.tokens`

### Requirement: Extensions array

`extensions` MAY be an array of plain strings or objects with `id` (required), `url` (optional), `skill` (optional).

```yaml
extensions:
  - id: canvas
    url: https://www.drupal.org/project/canvas
  - id: layout_builder
    skill: designbook-data-model-layout-builder
  - address  # plain string
```

- `id` -- machine name for `when.extensions` conditions
- `url` -- optional; AI fetches to understand extension field types/entities
- `skill` -- optional; auto-injected as `config_instruction` into every workflow stage

#### Scenario: Extensions expose env vars
- **WHEN** `extensions: [{id: canvas, skill: designbook-data-model-canvas}, {id: paragraphs}]`
- **THEN** `DESIGNBOOK_EXTENSIONS=canvas,paragraphs`, `DESIGNBOOK_EXTENSION_SKILLS=designbook-data-model-canvas`

#### Scenario: Plain string backward-compatible
- **WHEN** `extensions: [layout_builder]` → `DESIGNBOOK_EXTENSIONS=layout_builder`, `DESIGNBOOK_EXTENSION_SKILLS=`

### Requirement: Workflow Rules in Config

`workflow.rules` MAY map stage names to string arrays. Strings are additional constraints applied during that stage, additive to skill rule files.

```yaml
workflow:
  rules:
    create-component:
      - "All interactive elements require ARIA labels"
```

#### Scenario: Config rules applied during stage
- **WHEN** executing `create-component` → read and apply `workflow.rules.create-component` alongside skill rules

#### Scenario: No workflow key
- **WHEN** no `workflow:` key → no config rules applied

### Requirement: Workflow Tasks in Config

`workflow.tasks` MAY map stage names to string arrays. Strings are appended as additional instructions to task file content (additive, never replacing task files).

```yaml
workflow:
  tasks:
    create-component:
      - "After creation, verify the component renders in Storybook"
```

#### Scenario: Config task instructions appended
- **WHEN** executing tasks for `create-component` → append config strings to task file content

### Requirement: sample_data.field_types config key

`sample_data.field_types` MAY map field type names to template names, used to auto-set `sample_template.template` during data model creation.

```yaml
sample_data:
  field_types:
    formatted_text: formatted-text
    text_with_summary: formatted-text
    link: link
    image: image
```

#### Scenario: Field type mapping during model creation
- **WHEN** config has mapping and AI creates a matching field → set `sample_template.template` to mapped value

#### Scenario: No sample_data key
- **WHEN** no `sample_data:` key → no automatic assignment
