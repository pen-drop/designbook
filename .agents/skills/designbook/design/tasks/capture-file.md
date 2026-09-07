---
title: Capture selected evidence file
trigger:
  steps: [capture-file]
domain: [references]
params:
  type: object
  required: [file_path]
  properties:
    file_path:
      type: string
      description: Absolute CLI-owned revision path for one selected asset.
result:
  type: object
  required: [file]
  properties:
    file:
      path: "{{ file_path }}"
      submission: direct
      $ref: ../schemas.yml#/CaptureFile
---

# Capture selected evidence file

The exact selected asset file associated with the observation scope.
