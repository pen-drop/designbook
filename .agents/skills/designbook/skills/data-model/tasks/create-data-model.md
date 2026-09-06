---
title: "Create Data Model"
trigger:
  steps: [create-data-model]
domain: [data-model, vision]
params:
  type: object
  properties:
    vision:
      path: $DESIGNBOOK_DATA/vision.yml
      workflow: vision
      type: object
    data_model:
      path: $DESIGNBOOK_DATA/data-model.yml
      type: object
result:
  type: object
  required: [data-model]
  properties:
    data-model:
      path: $DESIGNBOOK_DATA/data-model.yml
      $ref: ../schemas.yml#/DataModel
---

# Create data-model

Produce the declared artifact from the complete decisions in task parameters. Completion: all agreed fields and target objects are represented in the result.
