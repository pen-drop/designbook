## ADDED Requirements

### Requirement: Extensions array in config

The system SHALL support a top-level `extensions` array in `designbook.config.yml` that declares backend capabilities affecting content composition.

#### Scenario: Config with extensions

- **WHEN** `designbook.config.yml` contains `extensions: [layout_builder]`
- **THEN** the config loader SHALL expose `DESIGNBOOK_EXTENSIONS=layout_builder` as an environment variable

#### Scenario: Multiple extensions

- **WHEN** `designbook.config.yml` contains `extensions: [layout_builder, paragraphs]`
- **THEN** `DESIGNBOOK_EXTENSIONS` SHALL be `layout_builder,paragraphs` (comma-separated)

#### Scenario: No extensions

- **WHEN** `designbook.config.yml` has no `extensions` key
- **THEN** `DESIGNBOOK_EXTENSIONS` SHALL be empty string
- **AND** all bundles are treated as structured (default behavior, backward-compatible)

#### Scenario: Extensions are backend-agnostic

- **WHEN** any backend is configured (`drupal`, `wordpress`, `craft`, `custom`)
- **THEN** the `extensions` key SHALL be available at the top level, not nested under backend-specific keys
## Requirements
### Requirement: Extensions array in config

The system SHALL support a top-level `extensions` array in `designbook.config.yml` that declares backend capabilities affecting content composition.

#### Scenario: Config with extensions

- **WHEN** `designbook.config.yml` contains `extensions: [layout_builder]`
- **THEN** the config loader SHALL expose `DESIGNBOOK_EXTENSIONS=layout_builder` as an environment variable

#### Scenario: Multiple extensions

- **WHEN** `designbook.config.yml` contains `extensions: [layout_builder, paragraphs]`
- **THEN** `DESIGNBOOK_EXTENSIONS` SHALL be `layout_builder,paragraphs` (comma-separated)

#### Scenario: No extensions

- **WHEN** `designbook.config.yml` has no `extensions` key
- **THEN** `DESIGNBOOK_EXTENSIONS` SHALL be empty string
- **AND** all bundles are treated as structured (default behavior, backward-compatible)

#### Scenario: Extensions are backend-agnostic

- **WHEN** any backend is configured (`drupal`, `wordpress`, `craft`, `custom`)
- **THEN** the `extensions` key SHALL be available at the top level, not nested under backend-specific keys

