---
when:
  steps: [design-screen:create-scene]
params:
  section_id: ~
  section_title: ~
  section_description: ~
  scenes: []
  reference: []
reads:
  - path: $DESIGNBOOK_DATA/data-model.yml
    workflow: debo-data-model
  - path: $DESIGNBOOK_DATA/design-system/design-system.scenes.yml
    workflow: debo-design-shell
result:
  section-scenes:
    path: $DESIGNBOOK_DATA/sections/{{ section_id }}/{{ section_id }}.section.scenes.yml
    validators: [scene]
---

# Create Section Scene

Creates page scenes for a section, inheriting the shell layout. Write the result via stdin to the CLI:
```
workflow result --task $TASK_ID --key section-scenes
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
    reference:       # include ONLY when {{ reference }} is non-empty
      - type: "<url|image|...>"
        url: "<resource URL>"
        breakpoint: "<breakpoint name>"
        threshold: 3
        title: "<label>"
    # ↑ Write the reference entries from {{ reference }} param.
    #   If {{ reference }} is null or empty, OMIT the reference: key entirely.
    items:
      - scene: "design-system:[shell_name]"
        with:
          content:
            - entity: "[ENTITY_TYPE].[ENTITY_BUNDLE]"
              view_mode: "[VIEW_MODE]"

```

## Scene Node Types

Each entry in `items:` uses one of four keys:

- **`component:`** — render a UI component directly (`$COMPONENT_NAMESPACE:card`)
- **`entity:`** — render an entity from sample data (`node.article`, `view.recent_articles`)
- **`scene:`** — embed the shell and fill `$content`. The scene MUST start with `design-system:` followed by an existing scene name under the design-system folder.
- **`image:`** — render an image using a named image style from `config.image_style` in data-model.yml. The value is the style name (e.g. `hero`, `"16_9"`). Add `alt` for alt text, optional `src` for custom images.

## Ensure Meta

After writing the scene file, ensure `meta.yml` is created for each story via the `DeboStory` entity. This is handled automatically when design-verify runs as a subworkflow — the intake queries `_debo story --scene ${section_id}:${scene_name}` which triggers `ensureMeta()` if needed.

## Constraints

- **No `type: element`** — plain strings for text content
- **`group:`** must be `"Designbook/Sections/{{ section_title }}"`

