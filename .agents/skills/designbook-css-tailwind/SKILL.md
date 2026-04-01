---
name: designbook-css-tailwind
disable-model-invocation: true
user-invocable: false
description: Tailwind CSS v4 framework rules — structural token naming conventions (layout-width, layout-spacing, grid) and CSS token generation via @theme. Use when DESIGNBOOK_FRAMEWORK_CSS includes tailwind (directly or via daisyui).
---

# Designbook CSS Tailwind

Tailwind v4 CSS generation rules. Generates `@theme` blocks from W3C Design Tokens.

> **This skill is loaded by `css-generate`** for CSS generation. Token naming conventions for the `debo-design-tokens` dialog are loaded automatically via `rules/tailwind-naming.md`.

Non-standard namespaces (e.g. `--layout-spacing-*`, `--grid-*`) require `var()`:

```html
<div class="py-[var(--layout-spacing-md)]">...</div>
```

## Task Files

- [create-tokens.md](tasks/create-tokens.md) — Generate `design-tokens.yml` (fallback, loaded by `debo-design-tokens`)

## Rules

- [css-mapping.md](rules/css-mapping.md) — Token-group-to-CSS mapping for the generic `generate-jsonata` task
- [tailwind-naming.md](rules/tailwind-naming.md) — Token naming conventions for `layout-width`, `layout-spacing`, `grid`
