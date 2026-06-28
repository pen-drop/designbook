---
title: "Transform slice to Drupal config"
trigger:
  steps: [sync-to:transform]
params:
  type: object
  required: [slices]
  properties:
    slices:
      type: array
      description: Ordered list of export slices from the resolve-filter stage.
      items:
        $ref: ../schemas.yml#/ExportSlice
result:
  type: object
  required: [config-set]
  properties:
    config-set:
      type: array
      description: DrupalConfigEntity items produced by transforming the current slice.
      $ref: ../schemas.yml#/DrupalConfigSet
      validators:
        - "schema:DrupalConfigSet"
        - "cmd:npx jsonata-w transform --dry-run {{ file }}"
each:
  slice:
    expr: "slices"
    schema:
      $ref: ../schemas.yml#/ExportSlice
---

# Transform

Transform one export slice into a set of Drupal configuration entities.

## Result: config-set

For content slices (`slice.kind = "content"`): resolve the entity-type blueprint for
`slice.entity_type`, compose its `### to_drupal` block with the `### prelude` from
the `field-types` blueprint, and run the composed expression against
`{ bundle: slice.bundle, def: slice.def }`.

For config slices (`slice.kind = "config"`): resolve the config-type blueprint for
`slice.config_key` and run its `### to_drupal` block against
`{ config_key: slice.config_key, def: slice.config_def }`.

The result is the `DrupalConfigEntity[]` array emitted by the expression.
