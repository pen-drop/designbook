---
when:
  backend: drupal
  extensions: canvas
  stages: [designbook-data-model:intake, create-data-model]
description: "Use for landing pages managed by the Canvas module. Canvas stores the component tree directly on the entity — no block_content indirection."
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
