---
trigger:
  steps: [design-entity:intake]
domain: [components, components.layout]
params:
  type: object
  required: [data_model]
  properties:
    entity_type:
      type: string
      default: ""
      description: Drupal entity type key (e.g. node, taxonomy_term, media). Empty = ask the user.
    bundle:
      type: string
      default: ""
      description: Bundle machine name within the entity type (e.g. article, tag). Empty = ask the user.
    view_mode:
      type: string
      default: ""
      description: View mode machine name (e.g. default, teaser, full). Empty = ask the user.
    data_model:
      path: $DESIGNBOOK_DATA/data-model.yml
      type: object
      $ref: ../../data-model/schemas.yml#/DataModel
result:
  type: object
  required: [components, entity_mappings, sample_data_bundles, section_id, entity_type, bundle, view_mode]
  properties:
    components:
      type: array
      items:
        $ref: ../schemas.yml#/Component
    entity_mappings:
      type: array
      items:
        $ref: ../schemas.yml#/EntityMapping
    sample_data_bundles:
      type: array
      items:
        $ref: ../../sample-data/schemas.yml#/BundleRef
    section_id:
      type: string
      description: Tag value written to __designbook.section on the generated records (use the bundle name; the entity view selects records by index, so the tag is just a label).
    entity_type:
      type: string
      description: Resolved entity type key for the chosen view-mode.
    bundle:
      type: string
      description: Resolved bundle machine name for the chosen view-mode.
    view_mode:
      type: string
      description: Resolved view mode machine name.
---

# Intake: Design Entity

Gather one entity view-mode and its component plan. No section, shell, or reference logic — this workflow renders a single entity standalone.

## Steps

1. **Resolve the bundle + view-mode.** Use the provided `entity_type`, `bundle`, and `view_mode` params when non-empty. Otherwise read `{{ data_model }}.content`, list available bundles and their view modes, and ask the user to pick one `entity_type.bundle` + one `view_mode`.
2. **Read the template.** From `{{ data_model }}.content[entity_type][bundle].view_modes[view_mode]` read the `template` and settings — this is what the mapping must target.
3. **Plan components.** Scan existing components; identify which components the chosen view-mode needs that do not yet exist. Present the plan and confirm.
4. **Summary.** Present the build plan (entity type, bundle, view-mode, template, new components) and wait for confirmation.

## Result: components

One entry per **new** component to create. Empty array when all required components already exist.

## Result: entity_mappings

A one-element array containing the single `{ entity_type, bundle, view_mode }` mapping the `entity-mapping` stage will produce.

## Result: sample_data_bundles

The `entity_type` + `bundle` pairs that need sample data: the chosen bundle plus every bundle reached by traversing its `type: reference` fields (leaf-first). `create-sample-data` expands one `data/<entity_type>.<bundle>.yml` per entry; the standalone entity view renders the chosen view-mode against those pool records.
