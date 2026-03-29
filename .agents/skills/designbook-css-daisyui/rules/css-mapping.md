---
when:
  frameworks.css: daisyui
  steps: [generate-jsonata, generate-css]
---

# CSS Mapping — DaisyUI

Maps design token groups to CSS output. DaisyUI extends Tailwind v4, so this mapping includes both DaisyUI-specific groups (color with `@plugin` wrapper) and Tailwind structural groups.

```yaml
groups:
  color:
    prefix: color
    wrap: '@plugin "daisyui/theme"'
    meta:
      name: mytheme
      default: true
      color-scheme: light
  typography:     { prefix: font,           wrap: "@theme" }
  radius:         { prefix: radius,         wrap: "@theme" }
  layout-width:   { prefix: container,      wrap: "@theme" }
  layout-spacing: { prefix: layout-spacing, wrap: "@theme" }
  grid:           { prefix: grid,           wrap: "@theme" }
```

The `color` group uses DaisyUI's `@plugin "daisyui/theme"` wrapper instead of `@theme`. The `meta` block provides theme attributes (`name`, `default`, `color-scheme`) that are emitted before the color variables.
