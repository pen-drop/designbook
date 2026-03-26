---
params:
  section_id: ~
  section_title: ~
  section_description: ~
  scenes: []
reads:
  - path: $DESIGNBOOK_DIST/data-model.yml
    workflow: debo-data-model
  - path: $DESIGNBOOK_DIST/design-system/design-system.scenes.yml
    workflow: debo-design-shell
files:
  - $DESIGNBOOK_DIST/sections/{{ section_id }}/{{ section_id }}.section.scenes.yml
---

# Create Section Scene

Creates `sections/{{ section_id }}/{{ section_id }}.section.scenes.yml` — page scenes for a section, inheriting the shell layout.

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
    reference:              # optional — write when provided
      type: "stitch"
      url: "<resource URL>"
      title: "<label>"
    items:
      - scene: "design-system:shell"
        with:
          content:
            entity: "[ENTITY_TYPE].[ENTITY_BUNDLE]"
            view: "[VIEW_NAME]"
                        
```

## Scene Node Types

Each entry in `items:` uses one of three keys:

- **`scene:`** — embed the shell and fill `$content`
- **`component:`** — render a UI component directly with props/slots
- **`entity:`** — render an entity from sample data (`node.article`, `view.recent_articles`)

## Constraints

- **Provider prefix** — every `component:` value uses `provider:name`
- **No `type: element`** — plain strings for text content
- **`group:`** must be `"Designbook/Sections/{{ section_title }}"`
- For listings use `entity: view.*` — never `records:` shorthand
