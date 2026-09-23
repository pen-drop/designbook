---
trigger:
  steps: [transform, sync-to:transform, sync-to:intake]
filter:
  backend: drupal
---

# Drupal config transform routing

Select the first applicable source for each config unit:

1. A loaded blueprint whose `trigger.config_name` matches `unit.config_name`:
   use its `to_drupal` section.
2. For content-derived units, the entity-type blueprint and the field-types
   prelude for field units.
3. For config slices, the config-type blueprint.
4. Otherwise the prepared live schema. Report this uncovered unit in the outtake
   so a schema-valid result does not conceal missing mapping guidance.

Author the unit's JSONata from its source definition and selected blueprint.
The prepared schema defines the allowed shape; the model and scene supply the
content. Extension and framework filters determine which blueprints are loaded.
