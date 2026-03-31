---
when:
  frameworks.css: tailwind
  steps: [generate-jsonata, generate-css]
---

# CSS Mapping — Tailwind v4

Maps design token groups to CSS output using Tailwind v4 `@theme` blocks.

```yaml
groups:
  color:          { prefix: color,          wrap: "@theme" }
  radius:         { prefix: radius,         wrap: "@theme" }
  shadow:         { prefix: shadow,         wrap: "@theme" }
  layout-width:   { prefix: container,      wrap: "@theme" }
  layout-spacing: { prefix: layout-spacing, wrap: "@theme" }
  grid:           { prefix: grid,           wrap: "@theme" }
  typography:     { prefix: font,           wrap: "@theme" }
```

Each group generates one `.jsonata` file that transforms `design-tokens.yml` → `css/tokens/{group}.src.css`.

Standard namespaces (`--color-*`, `--container-*`, `--radius-*`, `--shadow-*`, `--font-*`) auto-generate Tailwind utilities. Non-standard namespaces (`--layout-spacing-*`, `--grid-*`) require `var()` in markup.

## Theme Support

```yaml
theme_wrap: '[data-theme="{{ name }}"]'
```

For each theme file in `design-system/themes/`, the generator creates an additional `.jsonata` file that outputs a `[data-theme="..."]` block instead of `@theme`. Components use semantic color classes (`bg-primary`, `text-on-surface`) — no `dark:` variants needed. Theme switching is handled by setting the `data-theme` attribute on a parent element.
