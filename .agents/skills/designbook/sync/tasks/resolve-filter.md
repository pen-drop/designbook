---
title: Resolve Filter
trigger:
  steps: [sync-to:resolve-filter]
params:
  type: object
  required: [data_model]
  properties:
    data_model:
      $ref: designbook/data-model/schemas.yml#/DataModel
      type: object
      description: The loaded data model from the intake stage.
    filter:
      type: object
      description: >
        Filter from workflow params. Empty object = export all entity types,
        bundles, and config keys found in the data model.
      default: {}
result:
  type: object
  required: [units]
  properties:
    units:
      type: array
      description: >
        Ordered list of config-name units. Each unit identifies one Drupal
        configuration object to generate and write. The transform stage iterates
        over this array via each.
      items:
        $ref: ../schemas.yml#/ConfigNameUnit
---

# Resolve Filter

Expand the workflow filter into an ordered list of config-name units.

## Result: units

Each unit is one Drupal configuration object (one `.yml` file in the config/sync directory).

**For a content bundle slice** (`data_model.content.<entity_type>.<bundle>`) that matches the filter, emit these units in order:

1. One bundle-type unit: `config_name = <et>.type.<bundle>` (e.g. `node.type.article`, `media.type.image`, `block_content.type.basic`). Carries `entity_type`, `bundle`, `def`.
   - The standard pattern is `<et>.type.<bundle>` — applies to `node`, `media`, `block_content`, and all other content entity types.
   - The single exception is `taxonomy_term`: use `taxonomy.vocabulary.<bundle>` instead of `taxonomy_term.type.<bundle>`.
2. For each field in `def.fields`, one storage unit: `config_name = field.storage.<et>.<field_name>`. Carries `entity_type`, `field_name`, `def` (the field def from `def.fields.<field_name>`). Deduplicate storage units by `config_name` across all bundles — emit only once per unique `field.storage.*` name.
3. For each field in `def.fields`, one instance unit: `config_name = field.field.<et>.<bundle>.<field_name>`. Carries `entity_type`, `bundle`, `field_name`, `def` (the field def).
4. For each view mode in `def.view_modes` (if present), one display unit: `config_name = core.entity_view_display.<et>.<bundle>.<view_mode>`. Carries `entity_type`, `bundle`, `def` (the view-mode def from `def.view_modes.<view_mode>`).

**For a config slice** (`data_model.config.<config_key>`) that matches the filter:

- **General rule:** emit one unit with `config_name = <config_key>` (using the key exactly as it appears in the data model, e.g. `views.listing` → `config_name = views.listing`). Carries `config_key` and `def` (the config def).

- **Exception — `image_style`:** the `image_style` config block is bundle-nested (each child key is one image style, e.g. `ratio_16_9`). Do NOT emit a single `image_style` unit. Instead emit one unit PER child key: `config_name = image.style.<child>` (e.g. `image.style.ratio_16_9`). Each unit carries `config_key = image_style` and `def` set to the child def (e.g. `{ aspect_ratio: '16:9' }`). This mirrors how content bundles expand into multiple Drupal-named units and matches the `image.style.<name>` filename shape expected by Drupal. All OTHER config keys (already Drupal-native, e.g. `views.view.landing_teasers`) stay as single verbatim units.

When the filter is empty, include every entity type + bundle and every config key found in the data model.
