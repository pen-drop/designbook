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
      description: View mode machine name (e.g. default, teaser, full). Step 1 resolves which mode a run builds.
    form_mode:
      type: string
      default: ""
      description: Form mode machine name (e.g. default, compact, register). Step 1 resolves which mode a run builds.
    data_model:
      path: $DESIGNBOOK_DATA/data-model.yml
      type: object
      $ref: ../../skills/data-model/schemas.yml#/DataModel
result:
  type: object
  required: [components, entity_mappings, sample_data_bundles, section_id, entity_type, bundle, mode_kind]
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
        $ref: ../../skills/sample-data/schemas.yml#/BundleRef
    section_id:
      type: string
      description: Tag value written to __designbook.section on the generated records (use the bundle name; the entity view selects records by index, so the tag is just a label).
    entity_type:
      type: string
      description: Resolved entity type key for the chosen mode.
    bundle:
      type: string
      description: Resolved bundle machine name for the chosen mode.
    mode_kind:
      type: string
      enum: [view, form]
      description: Which half was chosen — view (reading) or form (editing). Recorded so map-entity does not re-derive it.
    view_mode:
      type: string
      description: Resolved view mode machine name when mode_kind = view; empty for a form run.
    form_mode:
      type: string
      description: Resolved form mode machine name when mode_kind = form; empty for a view run.
---

# Intake: Design Entity

Gather one entity mode — a view mode or a form mode — and its component plan. No section or shell planning — this
workflow renders one standalone entity root plus any renderable entity references required
by the shared entity-reference rendering rule. A standalone entity render has no scene file
and bears no route, so the screen-scene main-content rule (`screen-scene-constraints.md`) is a
screen concern and is out of scope here.

## Steps

1. **Resolve the bundle + mode (which half).** A run builds exactly one mode — a `view_mode` (reading half) or a `form_mode` (editing half). Resolve `mode_kind`:
   - `form_mode` supplied ⟹ `mode_kind = form`; `view_mode` supplied ⟹ `mode_kind = view`.
   - Both supplied non-empty ⟹ stop and report the error.
   - Neither supplied ⟹ read `{{ data_model }}.content`, list available bundles with **both** their `view_modes` and their `form_modes`, and ask the user to pick one `entity_type.bundle` plus one mode from either half; record which half was chosen as `mode_kind`.
2. **Read the template.** When `mode_kind = form`, read `template` and settings from `{{ data_model }}.content[entity_type][bundle].form_modes[form_mode]`; otherwise from `{{ data_model }}.content[entity_type][bundle].view_modes[view_mode]`. This is what the mapping must target.
3. **Plan components and mappings.** For a view run, produce the renderable entity closure required by
   the loaded rules, then add component entries for bundles that need new components.
   A form run targets the editing half only: it yields exactly one `entity_mappings` entry (`mode_kind: form`) for the chosen bundle and expands no renderable closure.
   Scan existing components to avoid duplicates. Present the plan and confirm.
4. **Summary.** Present the build plan (entity type, bundle, chosen mode + half, template, new components) and wait for confirmation.

## Result: components

One entry per **new** component the build needs for the planned entity mappings. A
referenced child bundle that needs visual output gets its own component when no suitable
component already exists. Empty array only when every required component already exists.

## Result: entity_mappings

One mapping per renderable bundle, each carrying its `mode_kind` and the matching mode name
(`view_mode` for a view entry, `form_mode` for a form entry). A view run lists one entry per bundle
in the entity closure; a form run lists exactly one entry, for the chosen bundle. The `entity-mapping`
stage's `each: mapping` produces one mapping per entry.

## Result: sample_data_bundles

The `entity_type` + `bundle` pairs that need sample data for the entity closure. Every
entry in `entity_mappings` has a corresponding pair here.
