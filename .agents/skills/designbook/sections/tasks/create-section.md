---
trigger:
  steps: [create-section]
params:
  type: object
  required: [section_id, section_title, description, order, vision]
  properties:
    section_id: { type: string, title: Section ID }
    section_title: { type: string, title: Section Title }
    description: { type: string, title: Description }
    order: { type: integer, title: Order }
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
      from: section_id
result:
  type: object
  required: [section-scenes]
  properties:
    section-scenes:
      path: $DESIGNBOOK_DATA/{scene_path}
      type: object
      validators: [scene]
      $ref: ../../scenes/schemas.yml#/SceneFile
each:
  section:
    $ref: ../schemas.yml#/Section
---

# Section

Create or update a section scenes file.

## Gathering (shape-section workflow only)

When called from the shape-section workflow, help the user define a specification for one roadmap section.

### Select Section

Parse the sections from the product vision. Check which sections already have specs at `${DESIGNBOOK_DATA}/sections/[section-id]/*.section.scenes.yml`.

**Section ID conversion:** Convert the section title to kebab-case: lowercase, remove `&`, replace non-alphanumeric with `-`, trim dashes.

If only one section is unspecified, auto-select it. If a section already has a spec, ask: "Update it or start fresh?"

### Gather Section Requirements

Ask 4–6 clarifying questions based on the section context. Key areas:

- "What are the main user actions or tasks in this section?"
- "What information should be displayed? (Consider the data model entities)"
- "What are the key user flows?"
- "What UI patterns fit best? (e.g., list view, grid, cards, detail page, form)"
- "What's in scope and what's explicitly out of scope?"
- "Should this section be wrapped in the application shell?"

### Present Draft Specification

Show the specification and iterate until satisfied.

## Output Format

**For the `sections` workflow** (intake only provides `section_id`, `section_title`, `description`, `order`):

```yaml
id: {{ section_id }}
group: "Designbook/Sections/{{ section_title }}"
title: "{{ section_title }}"
description: "{{ description }}"
status: planned
order: {{ order }}
scenes: []
```

**For the `shape-section` workflow** (also provides `user_flows`, `ui_requirements`, `use_shell`):

```yaml
id: {{ section_id }}
group: "Designbook/Sections/{{ section_title }}"
title: "{{ section_title }}"
description: "{{ description }}"
status: shaped
order: {{ order }}
scenes: []
```

## Rules

- `id` must match the directory name (kebab-case)
- Use only the fields available from the calling workflow's params
- If `user_flows` and `ui_requirements` are provided (non-empty), include them
- If `order` is not provided, omit it
- `scenes` starts as empty array — populated later by `/debo design-screen`
- **`group:`** must always be `"Designbook/Sections/{{ section_title }}"` — required in both workflows

## Constraints

- Be conversational — help the user think through requirements
- Keep specs focused on *what* the section needs, not *how* to implement it
- Reference the data model entities when discussing what information to display
- Each user flow should describe a complete path (start → action → result)
