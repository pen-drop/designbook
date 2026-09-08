---
title: Observe website
trigger:
  steps: [observe-website]
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

# Observe website

Source dump for the fixed website scope, written with `reference save`.
Catalogue JSON is CLI stdout. Required missing evidence is explicit.
