---
type: entity-type
name: media
priority: 10
when:
  backend: drupal
  steps: [design-token:intake]
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
