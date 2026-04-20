---
type: css-mapping
name: tailwind
priority: 10
trigger:
  domain: css
filter:
  frameworks.style: tailwind
---

# CSS Mapping — Tailwind v4

Maps design token groups to CSS output using Tailwind v4 `@theme` blocks.

```yaml
groups:
  primitive-color: { prefix: color,         wrap: "@theme", path: "primitive.color" }
  color:          { prefix: color,          wrap: "@theme", path: "semantic.color", resolve: "var" }
  radius:         { prefix: radius,         wrap: "@theme", path: "semantic.radius" }
  shadow:         { prefix: shadow,         wrap: "@theme", path: "semantic.shadow" }
  layout-width:   { prefix: container,      wrap: "@theme", path: "component.container.max-width" }
  layout-spacing: { prefix: layout-spacing, wrap: "@theme", path: "component.section.padding-y" }
  grid:           { prefix: grid,           wrap: "@theme", path: "component.grid.gap" }
  typography:     { prefix: font,           wrap: "@theme", path: "semantic.typography" }
  primitive-typography: { prefix: text,    wrap: "@theme", path: "primitive.typography" }
  typography-scale: { prefix: text,        wrap: "@theme", path: "semantic.typography-scale", expand: "typography" }
```

Each group generates one `.jsonata` file that transforms `design-tokens.yml` → `css/tokens/{group}.src.css`.

Standard namespaces (`--color-*`, `--container-*`, `--radius-*`, `--shadow-*`, `--font-*`, `--text-*`) auto-generate Tailwind utilities. Non-standard namespaces (`--layout-spacing-*`, `--grid-*`) require `var()` in markup.

The `typography-scale` group uses `expand: "typography"` to expand composite `$type: typography` tokens into individual CSS properties (see jsonata-template for expansion rules).
