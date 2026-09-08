---
title: Observe storybook
trigger:
  steps: [observe-storybook]
domain: [references]
params:
  type: object
  required: [source]
  properties:
    source:
      $ref: ../schemas.yml#/ObservationSource
result:
  type: object
  required: [observations]
  properties:
    observations:
      $ref: ../schemas.yml#/DesignReference
---

# Observe storybook

Observed structure, properties, selected screenshot associations and asset
evidence for the fixed source scope. Required missing observations are explicit.
