---
type: entity-type
name: node
priority: 10
when:
  backend: drupal
  steps: [design-token:intake]
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
