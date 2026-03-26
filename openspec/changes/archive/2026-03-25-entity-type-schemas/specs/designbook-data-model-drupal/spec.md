## MODIFIED Requirements

### Requirement: Skill Definition
- **Type**: Documentation / Reference Skill + Entity Type Schemas
- **Name**: `designbook-drupal/data-model/`
- **Description**: Guidelines and structured schemas for creating Drupal-compatible data models.

#### Scenario: Entity type schemas are part of the skill
- **WHEN** the designbook-drupal skill is loaded
- **THEN** entity type schema files at `entity-types/*.yml` are available for the intake task to read

### Requirement: Content Guidelines
The skill documentation SHALL cover:
1. **Entity Mapping**: content → node, assets → media, categories → taxonomy_term, reusable blocks → block_content (layout_builder), canvas pages → canvas_page (canvas extension)
2. **Field Naming**: base fields no prefix, custom fields must use `field_` prefix
3. **Entity Type Schemas**: structured YAML files per entity type defining base fields and required status

#### Scenario: Skill covers all supported entity types
- **WHEN** the skill is read during intake
- **THEN** it documents node, media, taxonomy_term, block_content, canvas_page, and view entity types with their base fields
