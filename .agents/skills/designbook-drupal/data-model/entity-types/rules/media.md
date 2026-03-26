---
when:
  backend: drupal
  stages: [designbook-data-model:intake, create-data-model]
description: "Use for media assets — images, videos, documents, or any file-based content referenced by other entities."
---

# Entity Type: media

```yaml
entity_type: media
section: content
base_fields:
  name:
    type: string
    required: true
```
