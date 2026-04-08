# Extensions Config Specification

## Purpose
Define how the `extensions` array in `designbook.config.yml` is structured, normalized, and exposed as environment variables.

## Requirements

### Requirement: Extensions array in config

The system SHALL support a top-level `extensions` array in `designbook.config.yml` that declares backend capabilities affecting content composition. Each entry MUST be either a plain string or an object with `id` (required), `url` (optional), and `skill` (optional).

```yaml
extensions:
  - id: canvas
    url: https://www.drupal.org/project/canvas
  - id: layout_builder
    skill: designbook-data-model-layout-builder
  # plain string (backward-compatible):
  - address
```

#### Scenario: Object entries with id, url, and skill
- **WHEN** `designbook.config.yml` contains `extensions: [{id: canvas, url: https://example.com, skill: designbook-data-model-canvas}]`
- **THEN** the normalized entry SHALL have `id: "canvas"`, `url: "https://example.com"`, and `skill: "designbook-data-model-canvas"`

#### Scenario: Plain string backward-compatible
- **WHEN** `designbook.config.yml` contains `extensions: [layout_builder]`
- **THEN** the normalized entry SHALL be `{id: "layout_builder"}` with no `url` or `skill`

### Requirement: Extensions exposed as comma-separated IDs
The config loader SHALL expose `DESIGNBOOK_EXTENSIONS` as a comma-separated list of extension IDs.

#### Scenario: Multiple extensions
- **WHEN** `designbook.config.yml` contains `extensions: [{id: canvas}, {id: paragraphs}]`
- **THEN** `DESIGNBOOK_EXTENSIONS` SHALL be `canvas,paragraphs`

#### Scenario: No extensions
- **WHEN** `designbook.config.yml` has no `extensions` key
- **THEN** `DESIGNBOOK_EXTENSIONS` SHALL be empty string

### Requirement: Extension skills exposed as comma-separated IDs
The config loader SHALL expose `DESIGNBOOK_EXTENSION_SKILLS` as a comma-separated list of skill IDs from extensions that declare a `skill` key.

#### Scenario: Mixed extensions with and without skills
- **WHEN** `designbook.config.yml` contains `extensions: [{id: canvas, skill: designbook-data-model-canvas}, {id: paragraphs}]`
- **THEN** `DESIGNBOOK_EXTENSION_SKILLS` SHALL be `designbook-data-model-canvas`

#### Scenario: No extensions declare skills
- **WHEN** `designbook.config.yml` contains `extensions: [{id: canvas}, {id: paragraphs}]`
- **THEN** `DESIGNBOOK_EXTENSION_SKILLS` SHALL be empty string

### Requirement: Extensions are backend-agnostic
The `extensions` key SHALL be available at the top level of `designbook.config.yml`, not nested under backend-specific keys.

#### Scenario: Top-level placement
- **WHEN** any backend is configured (`drupal`, `wordpress`, `craft`, `custom`)
- **THEN** the `extensions` key MUST remain at the top level of the config file
