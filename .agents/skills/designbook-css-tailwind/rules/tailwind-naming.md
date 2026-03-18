---
when:
  frameworks.css: tailwind
  stages: [debo-design-tokens:dialog, create-tokens]
---

# Tailwind Token Naming Rules

## Token Group Names

Use canonical Tailwind v4 group names:

| Dialog label | Token group | CSS variable prefix | Generates utilities? |
|---|---|---|---|
| "container widths" | `layout-width` | `--container-*` | ✅ Yes — `max-w-sm`, `max-w-md`, etc. |
| "section spacing" | `layout-spacing` | `--layout-spacing-*` | ❌ No — use `py-[var(--layout-spacing-md)]` |
| "grid gaps" | `grid` | `--grid-*` | ❌ No — use `gap-[var(--grid-gap-md)]` |
| "colors" | `color` | `--color-*` | ✅ Yes — `bg-*`, `text-*`, `border-*` |
| "border radius" | `radius` | `--radius-*` | ✅ Yes — `rounded-sm`, `rounded-md`, etc. |
| "shadows" | `shadow` | `--shadow-*` | ✅ Yes — `shadow-sm`, `shadow-md`, etc. |

Never use `container` or `section-spacing` as token group names.

## Sub-key Conventions

### `layout-width`
Sub-keys: `sm`, `md`, `lg`, `xl`

### `layout-spacing`
Sub-keys: `sm`, `md`, `lg`

### `grid`
Sub-keys: `gap-sm`, `gap-md`, `gap-lg`

### `color`
Sub-keys: semantic names matching the design system (e.g. `primary`, `secondary`, `neutral`, `base-100`)

### `radius`
Sub-keys: `sm`, `md`, `lg`, `full`

### `shadow`
Sub-keys: `sm`, `md`, `lg`

## CSS Variable Mapping

| Token group | CSS variable | Tailwind utility |
|---|---|---|
| `layout-width.md` | `--container-md` | `max-w-md` (auto-generated) |
| `layout-spacing.md` | `--layout-spacing-md` | `py-[var(--layout-spacing-md)]` |
| `grid.gap-md` | `--grid-gap-md` | `gap-[var(--grid-gap-md)]` |
| `color.primary` | `--color-primary` | `bg-primary`, `text-primary` (auto-generated) |
| `radius.md` | `--radius-md` | `rounded-md` (auto-generated) |
| `shadow.md` | `--shadow-md` | `shadow-md` (auto-generated) |

> Standard namespaces (`--container-*`, `--color-*`, `--radius-*`, `--shadow-*`) — utilities are generated automatically.
> Non-standard namespaces (`--layout-spacing-*`, `--grid-*`) — always use `var()` in class values.
