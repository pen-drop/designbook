---
when:
  steps: [tokens:intake, create-tokens]
---

# Renderer Hints ($extensions.designbook.renderer)

Every `$type: dimension` token group MUST include `$extensions.designbook.renderer` to control how the tokens page visualizes them. Without this hint, all dimension groups default to proportional bars which is misleading for small values like radius or gaps.

## Format

```yaml
semantic:
  radius:
    $extensions:
      designbook:
        renderer: radius
    sm:
      $value: "0.125rem"
      $type: dimension
```

## Available Renderers

| Renderer value | Visual | Use for |
|----------------|--------|---------|
| `bar` | Proportional horizontal bars scaled to group max | Generic large px/rem values |
| `color` | Color swatches with hex labels | Color tokens (`$type: color`) — auto-detected, no hint needed |
| `screen` | Device silhouettes (phone → tablet → laptop → desktop) with breakpoint labels | Responsive breakpoints |
| `container` | Nested rectangles showing proportional container widths | Container max-widths |
| `radius` | Squares with border-radius applied | Border radius tokens |
| `gap` | Inline boxes separated by the gap value | Grid gaps |
| `spacing` | Boxes stacked vertically, all tokens side by side | Section spacing, vertical padding |

## Decision Table

When creating `$type: dimension` token groups, use this table to choose the correct renderer:

| Group purpose | Level | Renderer | Why |
|---------------|-------|----------|-----|
| Container max-widths | `component.container` | `container` | Nested rectangles show relative container sizes at a glance |
| Responsive breakpoints | `semantic.breakpoints` | `screen` | Device silhouettes make breakpoint-to-device mapping immediately clear |
| Border radius | `semantic.radius` | `radius` | Small values (0.125–1rem), visual corner shape preview is more useful than a bar |
| Grid gaps | `component.grid` | `gap` | Shows actual spacing between elements |
| Section vertical spacing | `component.section` | `spacing` | Shows actual spacing between elements |
| Generic small dimensions | any | `spacing` | Better than misleading proportional bars |
| Generic large dimensions | any | `bar` | Proportional comparison makes sense at large scale |

## Blueprint tokens

Blueprints include `$extensions.designbook.renderer` directly in their `required_tokens` frontmatter. When merging blueprint tokens into `component.*`, preserve these extensions.

## Auto-detected types

Groups with `$type: color` are automatically rendered as color swatches — no renderer hint needed.

All other non-dimension types (shadow, fontFamily, etc.) fall back to the generic key/value renderer.

Only `$type: dimension` needs the hint because "dimension" is too generic to determine the right visualization.
