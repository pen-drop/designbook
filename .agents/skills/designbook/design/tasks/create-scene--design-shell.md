---
params:
  provider: ~
files:
  - $DESIGNBOOK_OUTPUTS_CONFIG/design-system/design-system.scenes.yml
reads:
  - path: $DESIGNBOOK_OUTPUTS_COMPONENTS
    description: Shell components — location resolved by the active framework skill
---

# Create Shell Scene

Creates `design-system/design-system.scenes.yml` — the base layout scene that section scenes inherit via `scene: design-system:shell`.

## Output

```yaml
id: debo-design-system
title: Design System
description: [layout description]
status: planned
order: 0

group: "Designbook/Design System"
scenes:
  - name: shell
    reference:              # optional — write when provided in params
      type: "stitch"
      url: "<resource URL>"
      title: "<label>"
    items:
      - component: "COMPONENT_NAMESPACE:COMPONENT_NAME"
        slots:
          ...
          # Shell components nested according to their slot structure
          # Exactly one slot MUST be set to: $content
```

## Constraints

- **Discover, don't assume** — read actual components to determine slots and props
- **`$content` injection point** — exactly one slot in the root component must be `$content`
- **Inline everything** — all sub-component slots fully expanded with props and content. Never `story: default` alone
- **Provider prefix** — every `component:` value uses `{{ provider }}:name`
- **No `type: element`** — plain strings for text content
- **`group:`** must be `"Designbook/Design System"`
