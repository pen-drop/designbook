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
---

# Intake

Load the data model and capture the workflow filter so downstream stages have a consistent starting point.
