---
when:
  backend: drupal
  stages: [designbook-data-model:intake, create-data-model]
---

# Rule: Drupal Views Config Entities

`view` is a config entity type (defined in `entity-types/view.md`). Base fields and placement are defined there.

## Rules

- Declare `view_modes.default.template: list-view` (or the appropriate template for this view)
- `rows` is generated at sample data time — do NOT set row values in the data model
