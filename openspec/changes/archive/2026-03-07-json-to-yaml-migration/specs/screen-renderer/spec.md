# Delta: screen-renderer

## Changed Requirements

- **WHEN** the screen renderer loads data model
- **THEN** it SHALL read `data-model.yml` instead of `data-model.json`
- **AND** parse using YAML parser instead of JSON.parse

- **WHEN** the screen renderer loads sample data
- **THEN** it SHALL read `data.yml` instead of `data.json`
- **AND** parse using YAML parser instead of JSON.parse
