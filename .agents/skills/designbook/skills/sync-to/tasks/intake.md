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
    unit:
      type: string
      enum: [data-model, scene]
      default: data-model
      description: What to sync, from workflow params. `scene` triggers the Scene sync path.
    scene:
      type: string
      default: ""
      description: >
        Scene id (SceneDef.name) to sync, from workflow params. Set for `unit: scene`;
        empty for `unit: data-model`.
    section:
      type: string
      default: ""
      description: >
        Section id locating the Scene's scenes file, from workflow params. Set for
        `unit: scene`; empty for `unit: data-model`.
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
    unit:
      type: string
      enum: [data-model, scene]
      description: The sync unit, forwarded so resolve-filter picks the config-only or Scene path.
    scene:
      type: string
      description: The Scene id to sync, forwarded to resolve-filter. Empty for a data-model run.
    section:
      type: string
      description: The Scene's section id, forwarded to resolve-filter. Empty for a data-model run.
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

Forward `unit`, `scene`, and `section` from the workflow params into scope. For a `unit: scene` run these tell resolve-filter which Scene to expand into config and content units; for `unit: data-model` they are empty and resolve-filter takes the config-only path.

Set `validation_gate` to the value of the `gate` param (default `hard`) so `workflowDone` can read `scope.validation_gate` to decide whether to block on validation errors (hard) or record them and continue (soft).
