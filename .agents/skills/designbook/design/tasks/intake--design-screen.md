---
trigger:
  steps: [design-screen:intake]
domain: [components, components.layout]
params:
  type: object
  required: [data_model, design_scenes, vision, section_scenes]
  properties:
    reference_dir: { type: string, default: "" }
    data_model:
      path: $DESIGNBOOK_DATA/data-model.yml
      type: object
      $ref: ../../data-model/schemas.yml#/DataModel
    design_scenes:
      path: $DESIGNBOOK_DATA/design-system/design-system.scenes.yml
      type: object
      $ref: ../../scenes/schemas.yml#/SceneFile
    vision:
      path: $DESIGNBOOK_DATA/vision.yml
      type: object
      $ref: ../../vision/schemas.yml#/Vision
    section_scenes:
      path: $DESIGNBOOK_DATA/sections/[section-id]/[section-id].section.scenes.yml
      workflow: debo-shape-section
      type: object
      $ref: ../../scenes/schemas.yml#/SceneFile
result:
  type: object
  required: [component, output_path, entity_mappings, section_id, section_title]
  properties:
    component:
      type: array
      items:
        $ref: ../schemas.yml#/Component
    output_path:
      type: string
    entity_mappings:
      type: array
      items:
        $ref: ../schemas.yml#/EntityMapping
    section_id:
      type: string
    section_title:
      type: string
---

# Intake: Design Screen

Gather section, screen type, entity mappings, and component plan for one screen. The `extract-reference` stage runs after intake — design reference data is not available during intake.

## Steps

1. **Confirm section** — use provided section or ask the user
2. **Determine screen type** — landing, overview, or detail page; for landing pages ask about embedded entity lists
3. **Plan entities** — collect `entity:` nodes from section spec scenes, deduplicate by entity+view_mode, traverse `type: reference` fields recursively, order leaf-first; present table and confirm
4. **Plan components** — scan existing components, identify new ones needed per entity and screen-level; if `$reference_dir/extract.json` exists, derive from landmark structure; present grouped table and confirm
5. **Summary** — present complete build plan, wait for confirmation
6. **Structure preview** — ASCII tree per [structure-preview.md](partials/structure-preview.md), starting from `scene: design-system:shell` with `content` injection

## Result: component

One entry per **new** component. When `$reference_dir/extract.json` exists, include `design_hint` on each item.

## Result: output_path

`$DESIGNBOOK_DATA/sections/{{ section_id }}/{{ section_id }}.section.scenes.yml`
