---
when:
  frameworks.css: daisyui
  stages: [debo-design-tokens:dialog, create-tokens]
---

# DaisyUI Token Naming Rules

## Color Tokens — DaisyUI Semantic Names (required)

Color tokens MUST use DaisyUI semantic names so they map directly to DaisyUI theme variables and Tailwind utility classes.

### Core colors

| Token Name | DaisyUI Variable | Tailwind Class | Purpose |
|---|---|---|---|
| `primary` | `--color-primary` | `bg-primary`, `text-primary` | Main brand color — buttons, links, key actions |
| `primary-content` | `--color-primary-content` | `text-primary-content` | Foreground on primary |
| `secondary` | `--color-secondary` | `bg-secondary`, `text-secondary` | Secondary brand color — tags, highlights |
| `secondary-content` | `--color-secondary-content` | `text-secondary-content` | Foreground on secondary |
| `accent` | `--color-accent` | `bg-accent`, `text-accent` | Accent brand color — decorative, emphasis |
| `accent-content` | `--color-accent-content` | `text-accent-content` | Foreground on accent |
| `neutral` | `--color-neutral` | `bg-neutral`, `text-neutral` | Non-saturated UI parts — cards, sections |
| `neutral-content` | `--color-neutral-content` | `text-neutral-content` | Foreground on neutral |
| `base-100` | `--color-base-100` | `bg-base-100` | Page background |
| `base-200` | `--color-base-200` | `bg-base-200` | Slightly darker — card surfaces, elevations |
| `base-300` | `--color-base-300` | `bg-base-300` | Even darker — borders, dividers |
| `base-content` | `--color-base-content` | `text-base-content` | Main text color on base backgrounds |

### Optional status colors

| Token Name | DaisyUI Variable | Tailwind Class | Purpose |
|---|---|---|---|
| `info` | `--color-info` | `bg-info`, `text-info` | Informative messages |
| `info-content` | `--color-info-content` | `text-info-content` | Foreground on info |
| `success` | `--color-success` | `bg-success`, `text-success` | Success/safe messages |
| `success-content` | `--color-success-content` | `text-success-content` | Foreground on success |
| `warning` | `--color-warning` | `bg-warning`, `text-warning` | Warning/caution messages |
| `warning-content` | `--color-warning-content` | `text-warning-content` | Foreground on warning |
| `error` | `--color-error` | `bg-error`, `text-error` | Error/danger messages |
| `error-content` | `--color-error-content` | `text-error-content` | Foreground on error |

## `-content` Counterpart Rule

For every color token, derive its `-content` counterpart:
- Dark backgrounds → light content (`#FFFFFF` or similar)
- Light backgrounds → dark content (`#000000` or `#1F2937`)

## Typography Token Names

Font tokens use Tailwind's `font-*` naming convention:

| Token Name | Tailwind Class | Purpose |
|---|---|---|
| `heading` | `font-heading` | Headings (h1–h6) |
| `body` | `font-body` | Body text, UI elements |
| `mono` | `font-mono` | Code blocks, monospace |

## Radius Token Names

Border radius tokens use DaisyUI theme variables:

| Token Name | DaisyUI Variable | Purpose |
|---|---|---|
| `selector` | `--radius-selector` | Checkboxes, toggles, badges |
| `field` | `--radius-field` | Buttons, inputs, selects, tabs |
| `box` | `--radius-box` | Cards, modals, alerts |

## Layout Token Group Names (Tailwind structural)

DaisyUI projects use Tailwind v4 — use canonical structural group names:

| Dialog label | Token group | CSS variable prefix |
|---|---|---|
| "container widths" | `layout-width` | `--container-*` (standard, auto-generates utilities) |
| "section spacing" | `layout-spacing` | `--layout-spacing-*` (non-standard, use with `var()`) |
| "grid gaps" | `grid` | `--grid-*` (non-standard, use with `var()`) |

Never use `container` or `section-spacing` as token group names.

## Example Token JSON (DaisyUI)

```json
{
  "color": {
    "primary": { "$value": "#494FE5", "$type": "color", "description": "Main brand color" },
    "primary-content": { "$value": "#FFFFFF", "$type": "color", "description": "Text on primary" },
    "secondary": { "$value": "#FFC024", "$type": "color", "description": "Secondary accent" },
    "secondary-content": { "$value": "#000000", "$type": "color", "description": "Text on secondary" },
    "accent": { "$value": "#FF4E42", "$type": "color", "description": "Accent for emphasis" },
    "accent-content": { "$value": "#FFFFFF", "$type": "color", "description": "Text on accent" },
    "neutral": { "$value": "#3D4451", "$type": "color", "description": "Neutral UI" },
    "neutral-content": { "$value": "#FFFFFF", "$type": "color", "description": "Text on neutral" },
    "base-100": { "$value": "#FFFFFF", "$type": "color", "description": "Page background" },
    "base-200": { "$value": "#F2F2F2", "$type": "color", "description": "Card surfaces" },
    "base-300": { "$value": "#E5E6E6", "$type": "color", "description": "Borders" },
    "base-content": { "$value": "#1F2937", "$type": "color", "description": "Main text" }
  },
  "typography": {
    "heading": { "$value": "Satoshi", "$type": "fontFamily" },
    "body": { "$value": "Satoshi", "$type": "fontFamily" },
    "mono": { "$value": "JetBrains Mono", "$type": "fontFamily" }
  }
}
```

## Mapping User Intent → DaisyUI Token Names

When the user describes their colors during `debo-design-tokens`, map as follows:

| User says... | Maps to DaisyUI token |
|---|---|
| "primary color", "main brand color", "button color" | `primary` |
| "secondary color", "complementary color" | `secondary` |
| "accent", "highlight", "emphasis" | `accent` |
| "background", "page background" | `base-100` |
| "card background", "surface" | `base-200` |
| "border color", "divider" | `base-300` |
| "text color", "body text" | `base-content` |
| "dark", "neutral", "gray" | `neutral` |
