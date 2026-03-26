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
