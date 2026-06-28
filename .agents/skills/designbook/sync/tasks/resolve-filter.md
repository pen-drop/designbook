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
  required: [slices]
  properties:
    slices:
      type: array
      description: >
        Ordered list of export slices. Each slice identifies one transformable unit:
        a content entity type + bundle pair, or a config key from data_model.config.
        The transform stage iterates over this array via each.
      items:
        $ref: ../schemas.yml#/ExportSlice
---

# Resolve Filter

Expand the workflow filter into an ordered list of export slices.

## Result: slices

Each slice is one independently transformable unit. For `content.*.*` entries in the data model,
emit one slice per (entity_type, bundle) pair that matches the filter.
For `config.*` entries, emit one slice per config key that matches the filter.

When the filter is empty, include every entity type + bundle and every config key found in the data model.
