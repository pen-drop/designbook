---
title: 'Create Sample Data: {{ bundle.entity_type }}.{{ bundle.bundle }}'
trigger:
  steps:
    - create-sample-data
domain:
  - sample-data
params:
  type: object
  required:
    - section_id
    - bundle
    - data_model
    - components_dir
  properties:
    section_id:
      type: string
      description: Section identifier — becomes the __designbook.section tag value on every generated record
    bundle:
      $ref: ../schemas.yml#/BundleRef
    sample_data_bundles:
      type: array
      description: >-
        The entity_type+bundle pairs to generate, supplied by intake (rendered entities + their reference
        targets). The fixed inventory from which intake declares concrete tasks.
      items:
        $ref: ../schemas.yml#/BundleRef
    entities:
      type: array
      default: []
    data_model:
      path: $DESIGNBOOK_DATA/data-model.yml
      workflow: /debo-data-model
      type: object
    components_dir:
      path: $DESIGNBOOK_DIRS_COMPONENTS
      type: string
      description: Available components — required for canvas bundle generation (rule canvas.md)
result:
  type: object
  required:
    - sample-data
  properties:
    sample-data:
      path: $DESIGNBOOK_DATA/data/{{ bundle.entity_type }}.{{ bundle.bundle }}.yml
      $ref: ../schemas.yml#/SampleDataBundle
      validators:
        - data
---

# Sample Data

## Result: sample-data

Produce the complete sample pool for the selected bundle. Apply only the record/field changes fixed by intake; retain unrelated records and fields, stable IDs, order and existing section tags. Add the requested section tag without discarding other tags.

Reuse a sufficient pool without scheduling a write. When more samples are necessary, preserve existing records and append only the declared shortfall with unused IDs. A selected record update preserves its identity. Preserve other bundles and all unrelated model/display configuration.

Completion: every sample selector and required field recorded by intake resolves, with the preserved data unchanged. Bundles outside the selected scope remain untouched; an excluded bundle never replaces its existing pool with an empty result.
