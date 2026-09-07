---
title: Consume completed reference
trigger:
  steps: [extract-reference]
domain: [references]
params:
  type: object
  required: [reference_folder]
  properties:
    reference_folder:
      $ref: ../schemas.yml#/ReferenceFolder
result:
  type: object
  required: [reference_dir]
  properties:
    reference_dir:
      $ref: ../schemas.yml#/ReferenceFolder
---

# Consume completed reference

The completed immutable capture revision selected during intake. An intentionally
reference-free request returns an empty reference directory. This dependency has
no metadata, extract or screenshot write outputs.
