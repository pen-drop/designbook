---
title: Observe figma
trigger:
  steps: [observe-figma]
filter:
  extensions: [figma]
domain: [references]
params:
  type: object
  required: [source]
  properties:
    source:
      $ref: ../../designbook/design/schemas.yml#/ObservationSource
result:
  type: object
  required: [observations]
  properties:
    observations:
      $ref: ../../designbook/design/schemas.yml#/DesignReference
---

# Observe figma

Observed structure, properties, selected screenshot associations and asset
evidence for the fixed source scope. Required missing observations are explicit.
