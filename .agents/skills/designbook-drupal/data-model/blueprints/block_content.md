---
type: entity-type
name: block_content
priority: 10
trigger:
  domain: data-model
filter:
  backend: drupal
  extensions: layout_builder
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
