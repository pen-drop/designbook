---
trigger:
  steps: [create-scene]
domain: [components, scenes]
params:
  type: object
  required: [output_path, scene_id, section_id, section_title, components_dir]
  properties:
    output_path: { type: string }
    scene_id: { type: string }
    section_id: { type: string }
    section_title: { type: string }
    reference:
      type: array
      default: []
      items:
        $ref: ../schemas.yml#/Reference
    reference_dir: { type: string, default: "" }
    components_dir:
      path: $DESIGNBOOK_DIRS_COMPONENTS
      type: string
      description: Components -- location resolved by the active framework skill
    design_scenes:
      path: $DESIGNBOOK_DATA/design-system/design-system.scenes.yml
      type: object
    data_model:
      path: $DESIGNBOOK_DATA/data-model.yml
      type: object
result:
  type: object
  required: [scene-file]
  properties:
    scene-file:
      path: "{{ output_path }}"
      validators: [scene]
---

# Create Scene

Creates a scene file at `{{ output_path }}`. The exact structure depends on the active workflow step (shell or screen); see the applicable constraints rule.

## Result: scene-file

If `reference_dir` is non-empty and `reference` is empty, read `$reference_dir/extract.json` and construct the reference entry from its `source` field.
