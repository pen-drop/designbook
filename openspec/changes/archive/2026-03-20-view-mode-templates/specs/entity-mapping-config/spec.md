## ADDED Requirements

### Requirement: entity_mapping.templates in designbook.config.yml

`designbook.config.yml` SHALL support an optional `entity_mapping.templates` key — a map of template name to an object with a `description` string. This declares which templates are available in the project.

#### Scenario: Config with templates declared

- **WHEN** `designbook.config.yml` contains:
  ```yaml
  entity_mapping:
    templates:
      field-map:
        description: "Structured field mapping — entity fields drive component selection"
      layout-builder:
        description: "Drupal Layout Builder — sections and block references define the layout"
  ```
- **THEN** the config loader SHALL expose these as the available templates for this project

#### Scenario: AI uses descriptions during dialog

- **WHEN** the `debo-data-model` dialog asks the author which template to use for a view mode
- **THEN** it SHALL present the available templates with their descriptions from config

#### Scenario: No entity_mapping key

- **WHEN** `designbook.config.yml` has no `entity_mapping` key
- **THEN** the config loader SHALL not error — templates are simply undeclared

## REMOVED Requirements

### Requirement: Extensions array in config

**Reason**: Replaced by `entity_mapping.templates`. The `extensions` array was used to select extension-specific routing rules (e.g. `layout_builder` → `compose-layout-builder` rule). With per-view-mode `template` keys, the extension is expressed directly in the data model — no global flag needed.

**Migration**: Remove `extensions` from `designbook.config.yml`. Add `entity_mapping.templates` with the templates your project uses. Update any bundle with `composition: unstructured` to declare explicit `template` keys per view_mode.
