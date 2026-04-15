---
type: entity-type
name: canvas_page
priority: 10
domain: data-model
when:
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
