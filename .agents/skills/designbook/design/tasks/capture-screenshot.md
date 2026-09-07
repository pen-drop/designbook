---
title: Capture selected screenshot
trigger:
  steps: [capture-screenshot]
domain: [references]
params:
  type: object
  required: [file_path]
  properties:
    file_path:
      type: string
      description: Absolute CLI-owned revision path for one selected screenshot.
result:
  type: object
  required: [file]
  properties:
    file:
      path: "{{ file_path }}"
      submission: direct
      validators: [image]
      $ref: ../schemas.yml#/CaptureFile
---

# Capture selected screenshot

The exact selected screenshot file associated with the observation scope.
