---
params:
  section_id: ~
  section_title: ~
  section_description: ~
  scenes: []
reads:
  - path: $DESIGNBOOK_DATA/data-model.yml
    workflow: debo-data-model
  - path: $DESIGNBOOK_DATA/design-system/design-system.scenes.yml
    workflow: debo-design-shell
files:
  - file: $DESIGNBOOK_DATA/sections/{{ section_id }}/{{ section_id }}.section.scenes.yml
    key: section-scenes
    validators: [scene]
---

# Create Section Scene

Creates page scenes for a section, inheriting the shell layout. Write the result via stdin to the CLI:
```
 write-file $WORKFLOW_NAME $TASK_ID --key section-scenes
```

## Input

- `data-model.yml` — available entity types and bundles for this section
- `design-system.scenes.yml` — the shell scene with `$content` placeholder

## Output

```yaml
id: {{ section_id }}
title: {{ section_title }}
description: {{ section_description }}
status: planned
order: [number]

group: "Designbook/Sections/{{ section_title }}"
scenes:
  - name: "[Scene Name]"
    reference:       # optional — write when provided
      type: "<stitch|figma|etc.>"
      url: "<resource URL>"
      title: "<label>"
    items:
      - scene: "design-system:[shell_name]"
        with:
          content:
            entity: "[ENTITY_TYPE].[ENTITY_BUNDLE]"
            view: "[VIEW_NAME]"

```

## Scene Node Types

Each entry in `items:` uses one of three keys:

- **`scene:`** — embed the shell and fill `$content`. The scene MUST start with `design-system:` followed by an existing scene name under the design-system folder.
- **`entity:`** — render an entity from sample data (`node.article`, `view.recent_articles`)

## Constraints

- **No `type: element`** — plain strings for text content
- **`group:`** must be `"Designbook/Sections/{{ section_title }}"`

