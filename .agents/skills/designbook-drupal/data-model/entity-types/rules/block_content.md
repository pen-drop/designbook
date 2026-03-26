---
when:
  backend: drupal
  extensions: layout_builder
  stages: [designbook-data-model:intake, create-data-model]
description: "Use for reusable layout sections placed via Layout Builder. One layer deep only — no nested block_content."
---

# Entity Type: block_content

```yaml
entity_type: block_content
section: content
base_fields:
  info:
    type: string
    required: true
  status:
    type: boolean
    required: true
```
