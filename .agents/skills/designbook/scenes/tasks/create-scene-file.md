---
title: 'Create Scene File: {{ section.id }}'
trigger:
  steps:
    - create-scene-file
params:
  type: object
  required:
    - section
    - vision
  properties:
    section:
      type: object
      description: >
        SceneFile-top-level metadata for the file being created (id, title, description, status, order,
        group).
      $ref: ../schemas.yml#/SceneFile
    vision:
      path: $DESIGNBOOK_DATA/vision.yml
      workflow: /debo-vision
      type: object
    sections_dir:
      path: $DESIGNBOOK_DATA/sections/
      type: string
    scene_path:
      type: string
      description: Exact missing SceneFile path selected during intake.
      resolve: scene_path
      from: section.id
result:
  type: object
  required:
    - scene-file
    - scene_id
  properties:
    scene-file:
      path: $DESIGNBOOK_DATA/{{ scene_path }}
      type: object
      validators:
        - scene
      $ref: ../schemas.yml#/SceneFile
    scene_id:
      $ref: ../schemas.yml#/SceneId
---

# Create Scene File

Produce an initial SceneFile with the complete metadata supplied by intake and an empty scene array. Intake selects this initializer only for a missing file, before its declared scene write. Existing files remain intact.

Completion: the new file preserves the supplied section or canonical shell identity and is ready for its dependent write. The scene ID identifies the primary target selected during intake.
