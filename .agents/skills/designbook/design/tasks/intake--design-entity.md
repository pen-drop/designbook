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
3. **Plan components and mappings (leaf-first).** Traverse the chosen bundle's
   `type: reference` fields that target renderable bundles (`paragraph`/`node`/`media`).
   For the chosen bundle and each referenced child bundle: (a) add a `{ entity_type, bundle,
   view_mode }` entry to `entity_mappings`; (b) if no component exists for it, add a
   `components` entry; (c) on the parent, plan each child-holding reference field as a
   **slot** (`component.slots`), not a flat prop. Scan existing components to avoid
   duplicates. Present the plan and confirm.
4. **Summary.** Present the build plan (entity type, bundle, view-mode, template, new components) and wait for confirmation.

## Result: components

One entry per **new** component the build needs — the parent bundle's component **and** a
component for every referenced child bundle (from `entity_mappings`) that has none yet.
Each child bundle renders as its own component. A `type: reference` field on a parent that
holds rendered children is planned as a **slot** on the parent component (`component.slots`),
never as a flat data prop. Empty array only when every required component already exists.

## Result: entity_mappings

One mapping per **renderable** bundle, leaf-first: the chosen bundle plus every bundle
reached by traversing its `type: reference` fields that target a renderable entity
(`paragraph`, `node`, `media`). Each entry is `{ entity_type, bundle, view_mode }`; the
`entity-mapping` stage's `each: mapping` produces one `<entity_type>.<bundle>.<view_mode>.jsonata`
per entry. A child rendered inside a parent slot needs its own mapping or the parent's
slot ref resolves to nothing.

## Result: sample_data_bundles

The `entity_type` + `bundle` pairs that need sample data: the chosen bundle plus every bundle reached by traversing its `type: reference` fields (leaf-first). `create-sample-data` expands one `data/<entity_type>.<bundle>.yml` per entry; the standalone entity view renders the chosen view-mode against those pool records.
