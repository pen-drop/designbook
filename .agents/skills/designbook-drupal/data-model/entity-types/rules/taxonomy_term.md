---
when:
  backend: drupal
  steps: [designbook-data-model:intake, create-data-model]
description: "Use for categories, tags, or any classification vocabulary referenced by content."
---

# Entity Type: taxonomy_term

```yaml
entity_type: taxonomy_term
section: content
base_fields:
  name:
    type: string
    required: true
  description:
    type: text
    required: false
  weight:
    type: integer
    required: false
```
