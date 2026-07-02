---
title: Intake
trigger:
  steps: [sync-to:intake]
params:
  type: object
  required: [data_model]
  properties:
    data_model:
      path: $DESIGNBOOK_DATA/data-model.yml
      type: object
      $ref: designbook/data-model/schemas.yml#/DataModel
    filter:
      type: object
      description: >
        Raw filter from workflow params. An empty object means "export everything".
        Non-empty keys constrain which entity types, bundles, or config keys are exported.
      default: {}
    gate:
      type: string
      enum: [hard, soft]
      default: hard
      description: Validation gate mode from workflow params.
result:
  type: object
  required: [data_model]
  properties:
    data_model:
      $ref: designbook/data-model/schemas.yml#/DataModel
      type: object
      description: The loaded data model, passed unchanged to resolve-filter.
    filter:
      type: object
      description: The filter as supplied by the workflow caller. Empty object means export all.
    validation_gate:
      type: string
      enum: [hard, soft]
      description: >
        Forwarded from the `gate` workflow param into scope so workflowDone can
        read `scope.validation_gate` for the soft-gate eval mode.
---

# Intake

Load the data model and capture the workflow filter so downstream stages have a consistent starting point.

Set `validation_gate` to the value of the `gate` param (default `hard`) so `workflowDone` can read `scope.validation_gate` to decide whether to block on validation errors (hard) or record them and continue (soft).
