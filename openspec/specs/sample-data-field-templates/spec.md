## Requirements

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

### Requirement: field_type condition on rules
Rules in skills MAY declare `when: field_type: <type>` as a condition. This applies the rule automatically to any field whose `type` matches, without requiring explicit `sample_template` on the field. Acts as a fallback for models without `sample_template`.

#### Scenario: field_type rule applies automatically
- **WHEN** a field has `type: formatted_text` and no `sample_template`
- **AND** a rule exists with `when: { stages: [create-sample-data], field_type: formatted_text }`
- **THEN** the AI applies that rule when generating the field's sample value

#### Scenario: explicit sample_template takes precedence over field_type
- **WHEN** a field has both `type: formatted_text` and `sample_template.template: custom-template`
- **THEN** the AI uses the `custom-template` rule, not the `field_type: formatted_text` rule

### Requirement: designbook-drupal sample-data skill
A `designbook-drupal/sample-data/` sub-directory SHALL be provided with rules for common Drupal field types. Rules declare `when: { stages: [create-sample-data], backend: drupal }` combined with `template:` or `field_type:` conditions.

Minimum templates provided:
- `formatted-text` — generates `{ value: "<p>...</p>", format: "basic_html" }`
- `link` — generates `{ uri: "https://...", title: "..." }`
- `image` — generates `{ uri: "public://filename.jpg", alt: "..." }`

#### Scenario: Drupal formatted-text rule generates correct structure
- **WHEN** backend is drupal
- **AND** a field has `sample_template.template: formatted-text` or `type: formatted_text`
- **THEN** the generated value is an object with `value` (HTML string) and `format` keys

#### Scenario: Drupal link rule generates correct structure
- **WHEN** backend is drupal
- **AND** a field has `sample_template.template: link` or `type: link`
- **THEN** the generated value is an object with `uri` and `title` keys

### Requirement: sample_template in data-model schema
The JSON schema for `data-model.yml` (`data-model.schema.yml`) SHALL include `sample_template` as an optional property on field definitions, with `template` (string, required) and `settings` (object with `additionalProperties: true`, optional).

#### Scenario: Valid field with sample_template passes schema validation
- **WHEN** a field in `data-model.yml` includes a valid `sample_template` block
- **THEN** schema validation passes without errors

#### Scenario: sample_template missing template key fails validation
- **WHEN** a field has `sample_template` but no `template` key
- **THEN** schema validation reports an error

### Requirement: Auto-assignment during data model creation
During `debo-data-model:dialog` and `create-data-model` stages, the AI SHALL read `sample_data.field_types` from `designbook.config.yml` and set `sample_template.template` on fields whose type has a mapping. Fields already having `sample_template` SHALL NOT be overwritten.

#### Scenario: AI sets sample_template from config mapping
- **WHEN** `designbook.config.yml` has `sample_data.field_types: { formatted_text: formatted-text }`
- **AND** user adds a field with `type: formatted_text` during the data model dialog
- **THEN** the AI sets `sample_template.template: formatted-text` on that field

#### Scenario: No config mapping leaves field without sample_template
- **WHEN** `designbook.config.yml` has no `sample_data.field_types`
- **THEN** the AI does not set `sample_template` during model creation

### Requirement: Sample rules for complex templates triggered by bundle purpose
Sample data rules for layout-builder and canvas SHALL be triggered by bundle `purpose` rather than field-level `sample_template.template`. The `layout_builder__layout` and `components` fields no longer require `sample_template` to activate their respective sample rules.

#### Scenario: layout-builder sample data triggered by purpose
- **WHEN** a bundle has `purpose: landing-page` AND `layout_builder` extension is active
- **THEN** `sample-layout-builder.md` rule applies to generate `layout_builder__layout` sample data
- **AND** the field does NOT need `sample_template: { template: layout_builder }` to trigger this

#### Scenario: canvas sample data triggered by purpose
- **WHEN** a bundle has `purpose: landing-page` AND `canvas` extension is active
- **THEN** `sample-canvas.md` rule applies to generate `components` sample data
- **AND** the field does NOT need `sample_template: { template: canvas }` to trigger this

#### Scenario: Simple field sample_templates unchanged
- **WHEN** a field has `sample_template: { template: formatted-text }`
- **THEN** the formatted-text sample rule applies as before — field-level sample_template is unchanged for simple types

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
