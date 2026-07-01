---
trigger:
  steps: [example:intake]
params:
  type: object
  required: [vision]
  properties:
    vision:
      path: $DESIGNBOOK_DATA/vision.yml
      type: object
    extract:
      type: object
    scene_id:
      type: string
result:
  type: object
  required: [components]
  properties:
    components:
      type: array
      items:
        $ref: ../schemas.yml#/Component
---

# Intake

Plan the components.
