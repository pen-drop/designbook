# token-type-renderers Specification

## Purpose
Visual renderer system in `DeboDesignTokens` for type-appropriate token visualization.

## Requirements

### Requirement: Three-tier renderer selection
Priority: (1) explicit `$extensions.designbook.renderer`, (2) dominant `$type` mapping, (3) generic fallback.

- Explicit renderer set -> use it regardless of `$type`
- `$type: dimension` (no explicit) -> `bar` renderer
- `$type: color` (no explicit) -> `color` renderer
- Unknown/unmapped type -> generic key:value text

### Requirement: Renderer registry
`RENDERERS` contains: `bar`, `color`, `container`, `spacing`, `gap`, `radius`, `screen`. Unregistered name falls back to generic.

| Renderer | Visualization |
|----------|--------------|
| `radius` | Squares with token value as `border-radius` |
| `bar` | Proportional horizontal bars scaled to group max |
| `gap` | Inline boxes separated by token value as CSS `gap` |
| `spacing` | Vertical blocks with hatched fill, height proportional to value |
| `container` | Nested outlined boxes, proportionally sized to group max |
| `screen` | Device emoji + breakpoint value label |
| `color` | Color swatches |

### Requirement: $extensions on groups
`design-tokens.schema.yml` SHALL allow `$extensions` on token groups. Example: `$extensions: { designbook: { renderer: "radius" } }`.

### Requirement: Dominant type detection
Per group, determine dominant `$type` for renderer selection when no explicit renderer set. Homogeneous groups use that type's renderer. Mixed groups use majority (>50%) type's renderer.

### Requirement: Leaf group collection with breadcrumbs
Traverse nested groups, collect leaf groups (containing tokens) with breadcrumb paths. Example: `component.container.max-width` -> "Component -> Container -> Max Width". Each leaf rendered as separate collapsible section.

### Requirement: Color category grouping
Color tokens grouped by category prefix: primary, secondary, accent, neutral, base, info, success, warning, error. Each category displays as labeled row of swatches.

### Requirement: Typography section
`DeboTypographySection` renders `$type: fontFamily` tokens as font cards showing preview ("Aa"), font name, label, and character preview.
