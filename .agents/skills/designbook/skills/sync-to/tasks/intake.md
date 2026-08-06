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
      $ref: designbook/skills/data-model/schemas.yml#/DataModel
    scene:
      type: string
      default: ""
      description: >
        Scene id (SceneDef.name) to sync, from workflow params. Set to take the scene
        branch; empty for a config/data-model export run.
    section:
      type: string
      default: ""
      description: >
        Section id locating the Scene's scenes file, from workflow params. Set when
        `scene` is set; empty for a config/data-model export run.
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
      $ref: designbook/skills/data-model/schemas.yml#/DataModel
      type: object
      description: The loaded data model, passed unchanged to resolve-filter.
    scene:
      type: string
      description: The Scene id to sync, forwarded to resolve-filter. Empty for a config/data-model run.
    section:
      type: string
      description: The Scene's section id, forwarded to resolve-filter. Empty for a config/data-model run.
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

Load the data model and capture the workflow inputs so downstream stages have a consistent starting point.

Forward `scene` and `section` from the workflow params into scope. When `scene` is set they tell resolve-filter which Scene to expand into config units (the scene branch — config only, never content); when empty, resolve-filter takes the config/data-model export path.

Set `validation_gate` to the value of the `gate` param (default `hard`) so `workflowDone` can read `scope.validation_gate` to decide whether to block on validation errors (hard) or record them and continue (soft).
