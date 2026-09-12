---
title: Capture selected PNG image
trigger:
  steps: [capture-image]
domain: [references]
params:
  type: object
  required: [file_path]
  properties:
    file_path:
      type: string
      description: Absolute CLI-owned revision path for one selected PNG screenshot.
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

# Capture selected PNG image

A valid selected PNG screenshot of the observed subject.
Its observation association is declared separately in the shared extract.
