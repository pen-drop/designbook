---
title: "Create Vision"
trigger:
  steps: [create-vision]
params:
  type: object
  properties:
    vision:
      path: $DESIGNBOOK_DATA/vision.yml
      type: object
result:
  type: object
  required: [vision]
  properties:
    vision:
      path: $DESIGNBOOK_DATA/vision.yml
      $ref: ../schemas.yml#/Vision
---

# Create vision

Produce the declared artifact from the complete decisions in task parameters. Completion: all agreed fields and target objects are represented in the result.
