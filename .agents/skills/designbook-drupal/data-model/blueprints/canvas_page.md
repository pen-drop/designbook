---
type: entity-type
name: canvas_page
priority: 10
trigger:
  domain: data-model
filter:
  backend: drupal
  extensions: canvas
---

# Entity Type: canvas_page

```yaml
entity_type: canvas_page
section: content
base_fields:
  title:
    type: string
    required: true
  components:
    type: component_tree
    required: true
```
