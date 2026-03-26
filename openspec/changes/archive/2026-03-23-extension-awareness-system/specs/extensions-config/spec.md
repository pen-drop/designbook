## MODIFIED Requirements

### Requirement: Extensions array in config

The system SHALL support a top-level `extensions` array in `designbook.config.yml` that declares backend capabilities affecting content composition.

Extensions MAY be declared as plain strings (backward-compatible) or as objects with `id`, optional `url`, and optional `skill` fields.

Two complementary mechanisms exist for extension-aware behavior:
1. **`when.extensions` condition** — rule files declare themselves applicable when a specific extension is active. Passive, no config needed.
2. **`skill` field** — an extension explicitly links a full Designbook skill. Used for complex extensions with dedicated task files, resources, and rules.

#### Scenario: Config with extensions as objects

- **WHEN** `designbook.config.yml` contains `extensions: [{id: layout_builder, url: "https://..."}]`
- **THEN** the config loader SHALL expose `DESIGNBOOK_EXTENSIONS=layout_builder` as an environment variable

#### Scenario: Config with extensions as plain strings (backward-compatible)

- **WHEN** `designbook.config.yml` contains `extensions: [layout_builder]`
- **THEN** the config loader SHALL expose `DESIGNBOOK_EXTENSIONS=layout_builder` as an environment variable
- **AND** the extension SHALL be treated as `{id: layout_builder}` internally

#### Scenario: Multiple extensions

- **WHEN** `designbook.config.yml` contains `extensions: [{id: layout_builder}, {id: paragraphs}]`
- **THEN** `DESIGNBOOK_EXTENSIONS` SHALL be `layout_builder,paragraphs` (comma-separated)

#### Scenario: Extension with skill declared

- **WHEN** an extension declares `skill: designbook-data-model-canvas`
- **THEN** the config loader SHALL expose `DESIGNBOOK_EXTENSION_SKILLS=designbook-data-model-canvas`
- **AND** that skill SHALL be auto-loaded as a `config_instruction` in any workflow stage that supports config_instructions

#### Scenario: Multiple extensions with skills

- **WHEN** multiple extensions declare `skill` values
- **THEN** `DESIGNBOOK_EXTENSION_SKILLS` SHALL be a comma-separated list of all declared skill IDs

#### Scenario: Extension skill does not exist

- **WHEN** an extension declares a `skill` that does not match any known skill ID
- **THEN** the config loader SHALL silently ignore the unknown skill
- **AND** `DESIGNBOOK_EXTENSION_SKILLS` SHALL not include the unknown skill ID

## ADDED Requirements

### Requirement: when.extensions condition in rule files

Rule files SHALL support a `when.extensions` condition that activates the rule only when the specified extension ID is present in `DESIGNBOOK_EXTENSIONS`.

#### Scenario: Rule with when.extensions loads when extension is active

- **WHEN** a rule file declares `when: extensions: canvas`
- **AND** `DESIGNBOOK_EXTENSIONS` contains `canvas`
- **THEN** the CLI SHALL include that rule file in the stage's resolved rules

#### Scenario: Rule with when.extensions is skipped when extension is absent

- **WHEN** a rule file declares `when: extensions: canvas`
- **AND** `DESIGNBOOK_EXTENSIONS` does not contain `canvas`
- **THEN** the CLI SHALL NOT include that rule file

#### Scenario: when.extensions combined with stages

- **WHEN** a rule file declares both `when: extensions: canvas` and `when: stages: [create-data-model]`
- **THEN** the rule SHALL only apply when BOTH conditions are satisfied

#### Scenario: No extensions

- **WHEN** `designbook.config.yml` has no `extensions` key
- **THEN** `DESIGNBOOK_EXTENSIONS` SHALL be empty string
- **AND** `DESIGNBOOK_EXTENSION_SKILLS` SHALL be empty string
- **AND** all bundles are treated as structured (default behavior, backward-compatible)
- **AND** no rule files with `when.extensions` conditions SHALL be loaded

#### Scenario: Extensions are backend-agnostic

- **WHEN** any backend is configured (`drupal`, `wordpress`, `craft`, `custom`)
- **THEN** the `extensions` key SHALL be available at the top level, not nested under backend-specific keys
