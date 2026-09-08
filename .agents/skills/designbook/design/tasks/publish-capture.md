---
title: Publish captured observations
trigger:
  steps: [publish-capture]
domain: [references]
params:
  type: object
  required: [reference_folder]
  properties:
    reference_folder:
      $ref: ../schemas.yml#/ReferenceFolder
result:
  type: object
  required: [reference]
  properties:
    reference:
      path: "{{ reference_folder }}/meta.yml"
      $ref: ../schemas.yml#/Reference
---

# Publish captured observations

Selected-scope metadata for the capture revision. The CLI projects observations
from the source dump, this metadata and declared PNG/asset files at publication.
