---
trigger:
  steps: [create-entity-demo]
domain: [sample-data]
params:
  type: object
  required: [entity_type, bundle, view_mode, data_model, components_dir]
  properties:
    entity_type:
      type: string
      description: Entity type key as defined in the data model (e.g. node, media, taxonomy_term)
    bundle:
      type: string
      description: Bundle key within the entity type (e.g. article, image, tags)
    view_mode:
      type: string
      description: View mode for which demo records are needed (e.g. full, teaser, card)
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
  required: [entity-demo]
  properties:
    entity-demo:
      path: $DESIGNBOOK_DATA/entity-mapping/{{ entity_type }}.{{ bundle }}.demo.yml
      validators: [data]
      $ref: ../schemas.yml#/SampleData
---

# Create Entity Demo

Generate co-located demo records for a single entity bundle, shared by all of
its view-mode mappings. Idempotent — read the existing demo file, preserve
records, append only what is missing.

## Record count

Target **3 records** for `{{ entity_type }}.{{ bundle }}`. Read the existing file
first; if it already has N records, append `max(0, 3 - N)`.

## Output format

`{{ entity_type }}.{{ bundle }}.demo.yml` uses the `content:`/`config:` top-level
namespacing defined by the `field-values` rule, scoped to the single `{{ entity_type }}.{{ bundle }}`
bundle. Field value generation, reference field forms, idempotent append, and validation
are governed by that rule.
