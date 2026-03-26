## Why

The data-model skill has no structured definition of what base fields each Drupal entity type requires. This knowledge lives scattered across prose rule files, making it hard for the AI to reliably enforce required fields during data model creation.

## What Changes

- Add YAML schema files per entity type under `.agents/skills/designbook-drupal/data-model/entity-types/`
- Each schema declares `base_fields` with `required` flag and `section` (content vs config)
- Extension-specific entity types declare their `extensions` condition
- The data-model intake task loads these schemas to enforce base fields during creation
- Entity types covered: `node`, `media`, `taxonomy_term`, `block_content`, `canvas_page`, `view`

## Capabilities

### New Capabilities

- `drupal-entity-type-schemas`: Structured YAML schema files defining base fields, required status, and section placement for each Drupal entity type. Loaded during data model intake to enforce required fields and guide optional field suggestions.

### Modified Capabilities

- `designbook-data-model-drupal`: The intake task gains awareness of entity type schemas and must enforce base fields declared as required, and prompt for optional ones.

## Impact

- New files: `.agents/skills/designbook-drupal/data-model/entity-types/*.yml`
- Modified: `.agents/skills/designbook-drupal/data-model/tasks/` or intake rules — updated to load entity type schemas
- No breaking changes to `data-model.yml` output format
