## MODIFIED Requirements

### Requirement: sample_template on field
Fields in `data-model.yml` MAY declare a `sample_template` key with `template` (string, required) and `settings` (object, optional). `settings.hint` is a conventional key providing content guidance. Additional settings keys are template-specific.

```yaml
field_body:
  type: text_with_summary
  title: Body
  sample_template:
    template: formatted-text
    settings:
      hint: "Technical documentation with code examples"
```

Built-in templates provided by `designbook-sample-data`:
- `views` — generates a `rows[]` array of `{type: entity, entity_type, bundle, view_mode, record: N}` entries for view config entities

Backend-specific templates (e.g. `formatted-text`, `link`, `image`) are provided by backend skills such as `designbook-drupal/sample-data/`.

#### Scenario: Field with sample_template generates structured output
- **WHEN** a field in `data-model.yml` has `sample_template.template: formatted-text`
- **AND** the `create-sample-data` stage runs
- **THEN** the AI loads rules matching `when: template: formatted-text`
- **AND** generates a structured value according to that rule (e.g. `{ value: "<p>...</p>", format: "basic_html" }`)

#### Scenario: Field without sample_template generates plain string
- **WHEN** a field in `data-model.yml` has no `sample_template`
- **AND** no matching `when: field_type:` rule applies
- **THEN** the AI generates a plain string value

#### Scenario: settings.hint guides content
- **WHEN** a field has `sample_template.settings.hint: "Product description with features"`
- **THEN** the generated content reflects that context

#### Scenario: views template generates rows array
- **WHEN** a field has `sample_template.template: views`
- **AND** `settings.entity_type`, `settings.bundle`, and `settings.view_mode` are provided
- **THEN** the generated value is an array of `{type: entity, entity_type, bundle, view_mode, record: N}` objects
- **AND** `N` is a zero-based index into the target bundle's records in `data.yml`
- **AND** the number of rows matches `items_per_page` from the same record (default: 6)

#### Scenario: views template uses content records from pass 1
- **WHEN** the `views` template runs during config pass 2
- **AND** content pass 1 has generated records for the target bundle
- **THEN** the `record: N` indices in rows reference valid positions in the generated content bundle

## ADDED Requirements

### Requirement: entity reference format in content entities
Reference fields on `content:` entities SHALL store the target record's `id` value as a plain string. The `{type: entity, entity_type, bundle, view_mode, record: N}` object form is NOT used for content entity reference fields.

```yaml
# correct — content entity reference
content:
  node:
    pet:
      - id: pet-1
        field_shelter: shelter-1        # plain string ID
        field_category: cat-dogs        # plain string ID

# object form — only inside template-generated structures
config:
  view:
    pet_listing:
      - id: pet_listing
        rows:
          - type: entity                # template-generated
            entity_type: node
            bundle: pet
            view_mode: teaser
            record: 0
```

#### Scenario: content reference field validates as string ID
- **WHEN** `data-model.yml` declares `field_shelter` as `type: reference` targeting `node.shelter`
- **AND** `data.yml` sets `field_shelter: shelter-1`
- **THEN** the validator matches `shelter-1` against `id` fields of `content.node.shelter` records
- **AND** validation passes if a record with `id: shelter-1` exists

#### Scenario: object form reference in content field fails validation
- **WHEN** a content entity field stores `{type: entity, entity_type: node, bundle: shelter, record: 0}` instead of a string ID
- **THEN** the validator cannot match it against target record IDs
- **AND** a broken-reference warning is emitted
