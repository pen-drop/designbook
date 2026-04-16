---
when:
  steps: [create-vision]
params:
  type: object
  properties:
    vision:
      path: $DESIGNBOOK_DATA/vision.md
      type: object
result:
  type: object
  required: [vision]
  properties:
    vision:
      path: $DESIGNBOOK_DATA/vision.md
      type: object
      required: [product_name, description]
      properties:
        product_name: { type: string, title: Product Name }
        description: { type: string, title: Description }
        problems:
          type: array
          title: Problems & Solutions
          default: []
          items:
            type: object
            properties:
              title: { type: string }
              solution: { type: string }
        features:
          type: array
          title: Key Features
          default: []
          items: { type: string }
        design_reference:
          type: object
          title: Design Reference
          default: null
          properties:
            type: { type: string }
            url: { type: string }
            label: { type: string }
        references:
          type: array
          title: References
          default: []
          items:
            type: object
            properties:
              type: { type: string }
              url: { type: string }
              label: { type: string }
---

# Product Vision

Define the product vision through dialog. Extract fields from the user's message.
If all required fields are present, no questions needed.
If fields are missing, ask for all missing in a single question.
