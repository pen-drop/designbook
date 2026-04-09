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

The `image` template (backend-specific) SHALL generate an object with `alt` (string, required) and optionally `src` (string). It SHALL NOT generate `<img>` HTML tags.

```yaml
# data.yml output for image template
field_media:
  alt: "Modern architecture building"
```

Or with a custom source:

```yaml
field_media:
  alt: "Modern architecture building"
  src: "/images/custom.jpg"
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

#### Scenario: views template generates rows array
- **WHEN** a field has `sample_template.template: views`
- **AND** `settings.entity_type`, `settings.bundle`, and `settings.view_mode` are provided
- **THEN** the generated value is an array of `{type: entity, entity_type, bundle, view_mode, record: N}` objects
- **AND** `N` is a zero-based index into the target bundle's records in `data.yml`

#### Scenario: Image template generates object with alt text
- **WHEN** a field has `sample_template.template: image`
- **AND** the `create-sample-data` stage runs
- **THEN** the generated value is an object with `alt` (descriptive string) and no `src`
- **AND** the value does NOT contain `<img>` HTML tags
