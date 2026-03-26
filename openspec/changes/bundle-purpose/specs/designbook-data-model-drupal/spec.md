## MODIFIED Requirements

### Requirement: Content Guidelines
The skill documentation SHALL cover:
1. **Entity Mapping**: content → node, assets → media, categories → taxonomy_term, reusable blocks → block_content (layout_builder), canvas pages → canvas_page (canvas extension)
2. **Field Naming**: base fields no prefix, custom fields must use `field_` prefix
3. **Entity Type Schemas**: structured markdown files per entity type in `entity-types/` defining base fields and required status
4. **Bundle Purpose**: bundles may declare `purpose` to communicate semantic intent; extension rules respond to known purpose values to set view_modes templates and guide sample data generation

#### Scenario: Bundle purpose documented in skill
- **WHEN** the skill is read during intake
- **THEN** it documents that `purpose: landing-page` is the known purpose for bundles rendered by layout-builder or canvas
