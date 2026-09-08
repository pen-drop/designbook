---
title: Observe storybook
trigger:
  steps: [observe-storybook]
domain: [references]
params:
  type: object
  required: [source, reference_folder]
  properties:
    source:
      $ref: ../schemas.yml#/ObservationSource
    reference_folder:
      $ref: ../schemas.yml#/ReferenceFolder
result:
  type: object
  required: [extract]
  properties:
    extract:
      path: "{{ reference_folder }}/extract.json"
      submission: direct
      $ref: ../schemas.yml#/SourceDump
---

# Observe storybook

Source dump for the fixed Storybook scope, written with `reference save`.
Catalogue JSON is CLI stdout. Required missing evidence is explicit.
