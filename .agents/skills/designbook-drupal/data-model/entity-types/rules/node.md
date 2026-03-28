---
when:
  backend: drupal
  steps: [designbook-data-model:intake, create-data-model]
description: "Use for content types — articles, pages, products, or any structured content with fields."
---

# Entity Type: node

```yaml
entity_type: node
section: content
base_fields:
  title:
    type: string
    required: true
  body:
    type: text_with_summary
    required: false
```
