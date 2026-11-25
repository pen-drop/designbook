---
trigger:
  domain: data-mapping
filter:
  backend: drupal
---

# Rule: Formatted Companion

`<field>_formatted` is a sample-data display companion of the declared `<field>`, never a Drupal
field. A mapping value read from `$fields.<field>_formatted` exports as `<field>` rendered through a
field formatter: the one `view_modes.<vm>.settings.formatters.<field>` names, else the one derived
from `<field>`'s type.

## Constraints

- Place `<field>` (`field_block:<et>:<bundle>:<field>`) where the companion is bound.
- The export holds no `field.storage.*`, no `field.field.*` and no placement named after
  `<field>_formatted`.
