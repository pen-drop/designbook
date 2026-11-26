---
trigger:
  domain: data-mapping
filter:
  backend: drupal
---

# Rule: Formatted Companion

`<field>_formatted` is a sample-data display companion of the declared `<field>`, never a Drupal
field. Drupal produces that display itself: `<field>` in a slot renders through its field
formatter.

## Constraints

- The export holds no `field.storage.*`, no `field.field.*`, no placement and no content value
  named after `<field>_formatted`.
