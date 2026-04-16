---
trigger:
  steps: [design-screen:create-scene]
---

# Screen Scene Constraints

Constraints specific to screen scenes (section pages).

## Rules

- **Shell inheritance** -- scene items MUST start with `scene: design-system:<shell_name>` and fill the `content` slot via `with:`.
- **Entity nodes allowed** -- use `entity:` with `view_mode:` for data-driven content
- **`group:`** must be `"Designbook/Sections/{{ section_title }}"`
- **`id:`** must match `{{ section_id }}`

## Output Structure

```yaml
id: {{ section_id }}
title: {{ section_title }}
description: {{ section_description }}
status: planned
order: [number]

group: "Designbook/Sections/{{ section_title }}"
scenes:
  - name: "[Screen Name]"
    items:
      - scene: "design-system:shell"
        with:
          content:
            - entity: "[ENTITY_TYPE].[ENTITY_BUNDLE]"
              view_mode: "[VIEW_MODE]"
            - component: "$DESIGNBOOK_COMPONENT_NAMESPACE:some-component"
              slots: ...
```
