---
trigger:
  domain: [data-model]
provides:
  data-model:
    properties:
      content:
        additionalProperties:
          additionalProperties:
            properties:
              fields:
                additionalProperties:
                  properties:
                    sample_template: { type: object }
---

# Rule: Auto-assign sample_template from Config

When adding or updating fields in the data model, check `designbook.config.yml` for a `sample_data.field_types` map and auto-assign `sample_template` accordingly.

## How to Apply

1. Read `sample_data.field_types` from `designbook.config.yml` (may be absent — skip silently if so)
2. For each field being created or updated:
   - If the field's `type` matches a key in `sample_data.field_types`
   - AND the field does not already have a `sample_template`
   - → Set `sample_template.template` to the mapped value

## Example

Given config:
```yaml
sample_data:
  field_types:
    formatted_text: formatted-text
    text_with_summary: formatted-text
    link: link
    image: image
```

A field `body: { type: formatted_text }` becomes:
```yaml
body:
  type: formatted_text
  title: Body
  sample_template:
    template: formatted-text
```

## Rules

- Do NOT overwrite an existing `sample_template` on a field
- Do NOT add `sample_template` if `sample_data.field_types` is absent from config
- `sample_template.settings` is left empty unless the user provides a hint
- This mapping is additive — it does not replace any other field properties
