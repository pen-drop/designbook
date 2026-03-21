## ADDED Requirements

### Requirement: sample_data.field_types config key
The `designbook.config.yml` file MAY include a `sample_data.field_types` map. Each key is a field type name (matching the `type` key on fields in `data-model.yml`). Each value is a template name used to set `sample_template.template` when that field type is added during data model creation.

```yaml
sample_data:
  field_types:
    formatted_text: formatted-text
    text_with_summary: formatted-text
    link: link
    image: image
    address: address
```

#### Scenario: Field type mapping read during model creation
- **WHEN** `designbook.config.yml` has `sample_data.field_types`
- **AND** the AI creates a field with a matching type during `debo-data-model:dialog` or `create-data-model`
- **THEN** the AI sets `sample_template.template` to the mapped value on that field

#### Scenario: No sample_data key in config
- **WHEN** `designbook.config.yml` has no `sample_data:` key
- **THEN** no automatic `sample_template` assignment occurs during model creation
