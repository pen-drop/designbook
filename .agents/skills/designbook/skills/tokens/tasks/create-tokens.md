---
trigger:
  steps: [create-tokens]
domain: [tokens]
title: Create Design Tokens
params:
  type: object
  required: [vision]
  properties:
    reference_dir:
      type: string
      description: Absolute published revision directory when deriving tokens from a reference.
    vision:
      path: $DESIGNBOOK_DATA/vision.yml
      workflow: /debo-vision
      type: object
    extract:
      description: Bounded token observations queried from the selected published subjects, views and states.
      $ref: ../../../design/schemas.yml#/DesignReference
      type: object
    design_tokens:
      path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      type: object
result:
  type: object
  required: [design_tokens]
  properties:
    design_tokens:
      path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      $ref: ../schemas.yml#/DesignTokens
---

# Design Tokens

Produce design tokens from the selected reference observations, or from the
explicit intake decisions when the request has no reference.
