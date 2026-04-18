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
      type: object
      default: null
      $ref: ../schemas.yml#/DesignReference
    components_dir:
      path: $DESIGNBOOK_DIRS_COMPONENTS
      type: string
      description: Components -- location resolved by the active framework skill
    components:
      type: array
      resolve: components_index
      description: >
        Live inventory of components currently rendered in Storybook.
        Every `component:` field in the scene result MUST match one of these ids —
        the compiled schema enum enforces this automatically.
      items:
        type: object
        required: [id]
        properties:
          id: { type: string }
          import_path: { type: string }
          story_id: { type: string }
    design_scenes:
      path: $DESIGNBOOK_DATA/design-system/design-system.scenes.yml
      type: object
      $ref: ../../scenes/schemas.yml#/SceneFile
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
      $ref: ../../scenes/schemas.yml#/SceneFile
---

# Create Scene

Creates a scene file at `{{ output_path }}`. The exact structure depends on the active workflow step (shell or screen); see the applicable constraints rule.

## Result: scene-file

Use `reference` (the `DesignReference`) to inform the scene's shell/section structure.
