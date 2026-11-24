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
      submission: direct
      $ref: ../schemas.yml#/Reference
---

# Publish captured observations

Selected-scope metadata for the capture revision. Publication fingerprints this
metadata together with the source dump and declared PNG/asset files.
