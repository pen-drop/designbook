---
when:
  steps: [design-shell:create-scene]
params:
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
        threshold: 3
        title: "<label>"
    # ↑ Write the reference entries from {{ reference }} param.
    #   If {{ reference }} is null or empty, OMIT the reference: key entirely.
    #   Reference entries describe the design source only — no breakpoint field.
    items:
      - component: "$COMPONENT_NAMESPACE:COMPONENT_NAME"
        slots:
          ...
          # Shell components nested according to their slot structure
          # Exactly one slot MUST be set to: $content
```

## Ensure Meta

After writing the scene file, ensure `meta.yml` is created for the story via the `DeboStory` entity. This is handled automatically when design-verify runs as a subworkflow — the intake queries `_debo story --scene design-system:shell` which triggers `ensureMeta()` if needed.

## Constraints

- **Discover, don't assume** — read actual components to determine slots and props
- **`$content` injection point** — exactly one slot in the root component must be `$content`
- **Inline everything** — all sub-component slots fully expanded with props and content. Never `story: default` alone
- **Provider prefix** — every `component:` value uses `$COMPONENT_NAMESPACE:name`
- **No `type: element`** — plain strings for text content
- **`group:`** must be `"Designbook/Design System"`
