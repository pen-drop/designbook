---
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

# Product Vision

Define the product vision through dialog. Extract fields from the user's message.
If all required fields are present, no questions needed.
If fields are missing, ask for all missing in a single question.
