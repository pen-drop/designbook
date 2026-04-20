---
trigger:
  steps: [create-scene]
domain: [components, scenes]
params:
  type: object
  required: [scene_path, components_dir]
  properties:
    scene_path:
      type: string
      description: >
        File path (relative to $DESIGNBOOK_DATA) of the target SceneFile.
        Supplied by the calling workflow via the scene_path resolver.
    components_dir:
      path: $DESIGNBOOK_DIRS_COMPONENTS
      type: string
      description: Components directory — location resolved by the active framework skill.
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
    reference:
      type: object
      default: null
      $ref: ../../design/schemas.yml#/DesignReference
    design_scenes:
      path: $DESIGNBOOK_DATA/design-system/design-system.scenes.yml
      type: object
      $ref: ../schemas.yml#/SceneFile
    data_model:
      path: $DESIGNBOOK_DATA/data-model.yml
      type: object
    section_scenes:
      path: "$DESIGNBOOK_DATA/{{ scene_path }}"
      type: object
      $ref: ../schemas.yml#/SceneFile
result:
  type: object
  required: [scene-file]
  properties:
    scene-file:
      path: "$DESIGNBOOK_DATA/{{ scene_path }}"
      validators: [scene]
      $ref: ../schemas.yml#/SceneFile
each:
  scene:
    expr: "scenes"
    schema: { $ref: ../schemas.yml#/SceneDef }
---

# Create Scene

Append one `SceneDef` to the SceneFile at `$DESIGNBOOK_DATA/{{ scene_path }}`. The file is expected to exist already — the calling workflow runs `create-scene-file` (or a roadmap workflow) before this task.

The exact structure depends on the active workflow step (shell or screen); see the applicable constraints rule:

- `shell-scene-constraints.md` when the scene is the design-system shell
- `screen-scene-constraints.md` when the scene is a section screen

## Inputs

- **`scene_path`** — the target file, resolved upstream via the `scene_path` resolver from either a Storybook `story_id` (design-screen) or `section.id` on a workflow-level `section` object (design-shell).
- **`section_scenes`** — the existing SceneFile content, from which the task reads `id`, `title`, `description`, and the existing `scenes[]` array. New scenes are appended to this array.
- **`reference`** — optional `DesignReference`, informs the scene's shell/section structure when present.

## Result: scene-file

Write the updated SceneFile: existing top-level fields preserved, `scenes[]` extended with the newly-derived `SceneDef` per scene binding.
