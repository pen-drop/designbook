---
trigger:
  domain: data-model
filter:
  backend: drupal
---

# Rule: Drupal Views Config Entities

`view` is a config entity type (defined in `entity-types/view.md`). Base fields and placement are defined there.

## Rules

- Set `view_modes.default.template` to the view's build form, resolved by the view build-form matrix; the listed rows render through their row bundle's view mode, never through the view's template
- `rows` is generated at sample data time — do NOT set row values in the data model
