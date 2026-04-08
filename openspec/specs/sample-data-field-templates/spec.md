## Requirements

### Requirement: sample_template on field

Fields in `data-model.yml` MAY declare `sample_template` with `template` (string, required) and `settings` (object, optional). `settings.hint` provides content guidance; additional keys are template-specific.

```yaml
field_body:
  type: text_with_summary
  title: Body
  sample_template:
    template: formatted-text
    settings:
      hint: "Technical documentation with code examples"
```

Built-in templates: `views` (generates `rows[]` of `{type: entity, entity_type, bundle, view_mode, record: N}`). Backend-specific templates (`formatted-text`, `link`, `image`) come from backend skills like `designbook-drupal/sample-data/`.

#### Scenario: Field with sample_template
- **WHEN** a field has `sample_template.template: formatted-text` and `create-sample-data` runs
- **THEN** load rules matching `when: template: formatted-text` and generate accordingly

#### Scenario: Field without sample_template
- **WHEN** no `sample_template` and no matching `field_type` rule → generate plain string

#### Scenario: settings.hint guides content
- **WHEN** `settings.hint: "Product description with features"` → generated content MUST reflect that context

#### Scenario: views template
- **WHEN** `template: views` with `entity_type`, `bundle`, `view_mode` settings
- **THEN** generate array of `{type: entity, entity_type, bundle, view_mode, record: N}` with zero-based indices into target bundle's records, count matching `items_per_page` (default 6)
- **AND** during pass 2, `record: N` indices reference valid positions from pass 1

### Requirement: field_type condition on rules

Rules MAY declare `when: field_type: <type>` to auto-apply to matching fields without requiring `sample_template`. Acts as fallback.

#### Scenario: field_type rule applies automatically
- **WHEN** field has `type: formatted_text`, no `sample_template`, and a rule exists with `when: { stages: [create-sample-data], field_type: formatted_text }` → apply that rule

#### Scenario: explicit sample_template takes precedence
- **WHEN** field has both `type: formatted_text` and `sample_template.template: custom-template` → use `custom-template` rule

### Requirement: designbook-drupal sample-data skill

`designbook-drupal/sample-data/` SHALL provide rules for Drupal field types with `when: { steps: [create-sample-data], backend: drupal }`.

Templates: `formatted-text` (plain HTML string), `link` (HTML anchor string), `image` (object with `alt`, optional `src`, no `<img>` tags or `public://` paths).

#### Scenario: Drupal formatted-text
- **WHEN** backend is drupal and field matches `formatted-text` or type `formatted_text`/`text_with_summary`/`text_long` → generate plain HTML string

#### Scenario: Drupal link
- **WHEN** backend is drupal and field matches `link` or type `link` → generate HTML anchor string

#### Scenario: Drupal image
- **WHEN** backend is drupal and field matches `image` or type `image` → generate object with `alt` key, optional `src`, no HTML tags or placeholder URLs

### Requirement: sample_template in data-model schema

`data-model.schema.yml` SHALL include `sample_template` as optional on fields: `template` (string, required), `settings` (object, additionalProperties: true, optional).

#### Scenario: Valid sample_template passes validation
#### Scenario: Missing template key fails validation

### Requirement: Auto-assignment during data model creation

During `debo-data-model:dialog` and `create-data-model`, the AI SHALL read `sample_data.field_types` from config and set `sample_template.template` on matching fields. Existing `sample_template` SHALL NOT be overwritten. No config mapping → no auto-assignment.

### Requirement: Complex templates triggered by bundle purpose

Layout-builder and canvas sample rules are triggered by bundle `purpose` (e.g. `landing-page`), not field-level `sample_template`. Simple field templates (e.g. `formatted-text`) remain field-level.

#### Scenario: layout-builder by purpose
- **WHEN** bundle has `purpose: landing-page` and `layout_builder` extension active → `sample-layout-builder.md` rule applies without needing `sample_template`

#### Scenario: canvas by purpose
- **WHEN** bundle has `purpose: landing-page` and `canvas` extension active → `sample-canvas.md` rule applies without needing `sample_template`

### Requirement: Entity reference format in content entities

Reference fields on `content:` entities store target record `id` as plain string. The `{type: entity, ...}` object form is only for template-generated structures.

```yaml
content:
  node:
    pet:
      - id: pet-1
        field_shelter: shelter-1        # plain string ID

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

#### Scenario: content reference validates as string ID
- **WHEN** `field_shelter: shelter-1` and a record `id: shelter-1` exists → validation passes

#### Scenario: object form in content field fails
- **WHEN** content field stores `{type: entity, ...}` instead of string ID → broken-reference warning
