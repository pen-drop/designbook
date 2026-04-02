---
type: css-mapping
name: tailwind
priority: 10
when:
  frameworks.css: tailwind
  steps: [generate-jsonata, generate-css]
---

# CSS Mapping — Tailwind v4

Maps design token groups to CSS output using Tailwind v4 `@theme` blocks.

```yaml
groups:
  color:          { prefix: color,          wrap: "@theme", path: "semantic.color" }
  radius:         { prefix: radius,         wrap: "@theme", path: "semantic.radius" }
  shadow:         { prefix: shadow,         wrap: "@theme", path: "semantic.shadow" }
  layout-width:   { prefix: container,      wrap: "@theme", path: "component.container.max-width" }
  layout-spacing: { prefix: layout-spacing, wrap: "@theme", path: "component.section.padding-y" }
  grid:           { prefix: grid,           wrap: "@theme", path: "component.grid.gap" }
  typography:     { prefix: font,           wrap: "@theme", path: "semantic.typography" }
```

Each group generates one `.jsonata` file that transforms `design-tokens.yml` → `css/tokens/{group}.src.css`.

Standard namespaces (`--color-*`, `--container-*`, `--radius-*`, `--shadow-*`, `--font-*`) auto-generate Tailwind utilities. Non-standard namespaces (`--layout-spacing-*`, `--grid-*`) require `var()` in markup.
