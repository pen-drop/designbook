---
when:
  steps: [design-shell:create-scene]
params:
  provider: ~
  reference: []
files:
  - file: $DESIGNBOOK_DATA/design-system/design-system.scenes.yml
    key: shell-scenes
    validators: [scene]
reads:
  - path: $DESIGNBOOK_DIRS_COMPONENTS
    description: Shell components — location resolved by the active framework skill
---

# Create Shell Scene

Creates the base layout scene that section scenes inherit via `scene: design-system:shell`. Write the result via stdin to the CLI:
```
 write-file $WORKFLOW_NAME $TASK_ID --key shell-scenes
```

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
    reference:              # include ONLY when {{ reference }} is non-empty
      - type: "url"
        url: "<resource URL>"
        breakpoint: "<breakpoint name>"
        threshold: 3
        title: "<label>"
    # ↑ Write the reference entries from {{ reference }} param.
    #   If {{ reference }} is null or empty, OMIT the reference: key entirely.
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
