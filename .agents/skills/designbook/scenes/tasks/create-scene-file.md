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
      flush: immediate
      type: object
      validators:
        - scene
      $ref: ../schemas.yml#/SceneFile
    scene_id:
      $ref: ../schemas.yml#/SceneId
---

# Create Scene File

Initialise the scene file for a section (or the design-system shell) with an empty `scenes: []` array. The file format is `SceneFile`; "section" is the content-semantic label used by the roadmap workflows.

**Idempotency:** if the file at `$DESIGNBOOK_DATA/{{ scene_path }}` already exists, leave it unchanged and emit it as the `scene-file` result verbatim. Only write when the file is missing.

## Output Format

**For the `sections` workflow** (intake only provides `id`, `title`, `description`, `order`):

```yaml
id: {{ section.id }}
group: "Designbook/Sections/{{ section.title }}"
title: "{{ section.title }}"
description: "{{ section.description }}"
status: planned
order: {{ section.order }}
scenes: []
```

**For the `shape-section` workflow** (also provides `user_flows`, `ui_requirements`, `use_shell`):

```yaml
id: {{ section.id }}
group: "Designbook/Sections/{{ section.title }}"
title: "{{ section.title }}"
description: "{{ section.description }}"
status: planned
order: {{ section.order }}
scenes: []
```

**For the `design-shell` workflow** (section id is `shell`, no conversational gathering):

```yaml
id: shell
group: "Designbook/Design System"
title: "Shell"
status: planned
scenes: []
```

## Rules

- `id` must match the directory name (kebab-case)
- Use only the fields available from the calling workflow's params
- If `user_flows` and `ui_requirements` are provided (non-empty), include them
- If `order` is not provided, omit it
- `scenes` starts as empty array — populated later by `/debo design-screen` or `/debo design-shell`
- `scene_id` must identify the scene file's primary scene target:
  - shell file → `design-system:shell`
  - section file → `{{ section.id }}:<scene-name>` once the scene name is known upstream
- **`group:`** must be `"Designbook/Sections/{{ section.title }}"` for section files, `"Designbook/Design System"` for the shell

## Constraints

- Use the section specification already recorded by intake; do not gather requirements during execution.
- Keep specs focused on *what* the file needs, not *how* to implement it
- Reference the data model entities when discussing what information to display
- Each user flow should describe a complete path (start → action → result)
