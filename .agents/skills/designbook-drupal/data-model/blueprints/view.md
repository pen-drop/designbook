---
type: entity-type
name: view
priority: 10
domain: data-model
when:
  backend: drupal
---

# Entity Type: view

```yaml
entity_type: view
section: config
base_fields:
  rows:
    type: view_rows
    required: true
  items_per_page:
    type: integer
    required: false
  header:
    type: text
    required: false
  footer:
    type: text
    required: false
  empty:
    type: text
    required: false
view_modes:
  required: true
```

## Rules

- `rows` is generated at sample data time from context (entity_type, bundle, view_mode of the targeted content) — do NOT manually declare row values in the data model
- Every view bundle MUST declare at least one `view_modes` entry
- `view` lives under `config:` in data-model.yml — NOT under `content:`
