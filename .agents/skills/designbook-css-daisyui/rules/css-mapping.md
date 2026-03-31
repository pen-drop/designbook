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

## Theme Support

DaisyUI has native multi-theme support via `@plugin "daisyui/theme"`. Each theme file generates its own `@plugin` block:

```yaml
theme_wrap: '@plugin "daisyui/theme"'
theme_meta:
  - "name: {{ name }}"
  - "color-scheme: {{ color-scheme }}"
```

For each theme file in `design-system/themes/`, the generator creates an additional `.jsonata` file that outputs a `@plugin "daisyui/theme"` block with the theme's `name` and `color-scheme` resolved from the theme file. The base color group's `meta` block uses `default: true`; theme overrides omit `default` so DaisyUI treats them as alternate themes.
