---
title: Observe website
trigger:
  steps: [observe-website]
filter:
  extensions: [website]
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

# Observe website

Observed structure, properties, selected screenshot associations and asset
evidence for the fixed source scope. Required missing observations are explicit.
