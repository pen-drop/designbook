---
name: designbook-css-tailwind
disable-model-invocation: true
user-invocable: false
description: Tailwind CSS v4 framework rules — structural token naming conventions (layout-width, layout-spacing, grid) and CSS token generation via @theme. Use when DESIGNBOOK_FRAMEWORK_CSS includes tailwind (directly or via daisyui).
---

# Designbook CSS Tailwind

Tailwind v4 CSS generation rules. Generates `@theme` blocks from W3C Design Tokens.

> **This skill is loaded by `css-generate`** for CSS generation. Token naming conventions for the `debo-design-tokens` dialog are loaded automatically via `rules/tailwind-naming.md`.

## ⛔ Styling Rules (Tailwind v4)

- Use Tailwind's built-in spacing scale (`p-4`, `gap-8`, `m-2`). No custom spacing tokens needed.
- `layout-width` tokens use `--container-*` namespace → auto-generates utilities
- `layout-spacing` and `grid` are non-standard namespaces → must use `var()`
- No hand-written CSS for containers, section spacing, or grid gaps

## Tailwind v4 Theme Variable Namespaces

In Tailwind v4, `@theme` variables are organized in namespaces. Standard namespaces auto-generate utility classes:

| Namespace | Token group | Generated Utilities |
|---|---|---|
| `--container-*` | `layout-width` | `max-w-*`, `@container:*` |
| `--color-*` | `color` | `bg-*`, `text-*`, `border-*` |
| `--font-*` | `typography` | `font-*` |
| `--radius-*` | `radius` | `rounded-*` |
| `--shadow-*` | `shadow` | `shadow-*` |

Non-standard namespaces (e.g. `--layout-spacing-*`, `--grid-*`) require `var()`:

```html
<div class="py-[var(--layout-spacing-md)]">...</div>
```

## Task Files

- [create-tokens.md](tasks/create-tokens.md) — Generate `design-tokens.yml` (fallback, loaded by `debo-design-tokens`)

## Rules

- [css-mapping.md](rules/css-mapping.md) — Token-group-to-CSS mapping for the generic `generate-jsonata` task
- [tailwind-naming.md](rules/tailwind-naming.md) — Token naming conventions for `layout-width`, `layout-spacing`, `grid`
