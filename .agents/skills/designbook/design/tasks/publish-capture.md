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
  required: [reference, reference_extract]
  properties:
    reference:
      path: "{{ reference_folder }}/meta.yml"
      $ref: ../schemas.yml#/Reference
    reference_extract:
      path: "{{ reference_folder }}/extract.json"
      $ref: ../schemas.yml#/DesignReference
---

# Publish captured observations

A complete shared observation result for the selected capture scope, with exact
source provenance and associations between observed structure, measurements,
subjects, views, states and file evidence.
