# Delta: data-model-workflow

## Changed Requirements

- **WHEN** the skill saves the data model
- **THEN** the file SHALL be saved as `designbook/data-model.yml` (YAML format, not JSON)
- **AND** the schema file SHALL be `schema/data-model.schema.yml` (YAML format)
- **AND** the validation command SHALL use YAML-compatible schema validation
