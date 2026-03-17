---
name: designbook-css-daisyui
description: DaisyUI framework rules — Tailwind-only styling, token naming conventions, and CSS token generation from W3C Design Tokens. Use when DESIGNBOOK_FRAMEWORK_CSS is daisyui.
---

# Designbook CSS DaisyUI

DaisyUI-specific rules for styling, token naming, and CSS token generation. This skill defines the styling constraints for the DaisyUI framework, the naming conventions for design tokens, and generates `.jsonata` expression files that produce DaisyUI-compatible CSS.

> **This skill is loaded:**
> 1. By `debo-design-tokens` workflow — for token naming conventions (§ Token Naming Conventions)
> 2. By `designbook-css-generate` workflow — for CSS generation rules (§ Generate Expression Files)

## Prerequisites

> ⛔ **MANDATORY**: Load `@designbook-css-tailwind` FIRST. The Tailwind v4 skill provides structural token conventions (layout-width, layout-spacing, grid) and the `@theme` generation rules that DaisyUI builds on.

## ⚠️ Styling Rules — Tailwind Classes Only

When `DESIGNBOOK_FRAMEWORK_CSS` is `daisyui`, **all styling MUST use Tailwind CSS utility classes and DaisyUI component classes exclusively**. No custom CSS is allowed.

### ✅ Allowed
- **Tailwind utility classes**: `text-lg`, `p-4`, `flex`, `gap-2`, `rounded-lg`, `bg-base-200`, etc.
- **DaisyUI component classes**: `btn`, `card`, `badge`, `navbar`, `hero`, `menu`, etc.
- **DaisyUI modifier classes**: `btn-primary`, `btn-sm`, `card-compact`, `badge-accent`, etc.
- **Tailwind responsive prefixes**: `md:text-xl`, `lg:grid-cols-3`, etc.
- **Tailwind state prefixes**: `hover:bg-base-300`, `focus:ring`, etc.

### ❌ Not Allowed
- Custom CSS files for component styling
- Inline `style` attributes
- CSS custom properties (`var(--my-color)`) in component markup
- `<style>` blocks in Twig templates
- Any hand-written CSS for layout, spacing, colors, or typography

### Why?
DaisyUI + Tailwind provides a complete design system through utility classes. All design tokens are mapped to Tailwind/DaisyUI theme values (via the generated CSS token files), making custom CSS unnecessary. This ensures:
- Consistent design language across all components
- Automatic dark mode support via DaisyUI themes
- No CSS specificity conflicts
- Smaller bundle sizes through Tailwind's purge mechanism

## DaisyUI Reference

The complete DaisyUI 5 documentation for components, colors, themes, and config is bundled with this skill:

- **Local**: `./resources/daisyui-llms.txt`
- **Upstream**: [daisyui.com/llms.txt](https://daisyui.com/llms.txt)

Read this file when you need to understand DaisyUI class names, theme format (`@plugin "daisyui/theme"`), color naming conventions, or component syntax.

---

## 🎨 Token Naming Conventions

When `DESIGNBOOK_FRAMEWORK_CSS` is `daisyui`, design tokens **MUST** use DaisyUI/Tailwind semantic names. This ensures tokens map directly to DaisyUI theme variables and Tailwind utility classes without additional translation.

> **Who uses this section?** The `debo-design-tokens` workflow reads this section to guide the user through naming their tokens correctly.

### Color Token Names (Required)

These are the **required** DaisyUI semantic color names. Every project must define at least the core colors:

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

### Color Token Names (Optional — Status Colors)

These are used for alerts, badges, and status indicators:

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

### Typography Token Names

Font tokens should use Tailwind's `font-*` naming convention:

| Token Name | Tailwind Class | Purpose |
|---|---|---|
| `heading` | `font-heading` | Headings (h1–h6) |
| `body` | `font-body` | Body text, UI elements |
| `mono` | `font-mono` | Code blocks, monospace |

### Radius Token Names

Border radius tokens should use DaisyUI theme variables:

| Token Name | DaisyUI Variable | Purpose |
|---|---|---|
| `selector` | `--radius-selector` | Checkboxes, toggles, badges |
| `field` | `--radius-field` | Buttons, inputs, selects, tabs |
| `box` | `--radius-box` | Cards, modals, alerts |

### Example Token JSON (DaisyUI)

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

### Mapping User Intent → DaisyUI Token Names

When the user describes their colors during the `debo-design-tokens` workflow, map as follows:

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

For each chosen color, **automatically derive the `-content` counterpart** by calculating contrast:
- Dark colors → `#FFFFFF` (or light tint) as content
- Light colors → `#000000` (or dark shade) as content

---

## Prerequisites

- Called by `designbook-css-generate` — all environment variables are already set
- `DESIGNBOOK_DIST` and `DESIGNBOOK_DRUPAL_THEME` are available

## Capability

### Generate Expression Files

**Trigger**: Called by `designbook-css-generate` step 3.

**Action**: Generate `.jsonata` expression files for DaisyUI-compatible CSS.

### Step 1: Ensure expression directory

```bash
mkdir -p $DESIGNBOOK_DIST/designbook-css-daisyui
```

### Step 2: Inspect token structure

Discover the top-level groups in the token file:

```bash
npx jsonata-w inspect $DESIGNBOOK_DIST/design-tokens.yml --summary
```

Each top-level group becomes **one `.jsonata` file** and **one `.src.css` output file**.

### Step 3: Generate `.jsonata` expression files

For **each top-level group**, create a `.jsonata` file at:

```
$DESIGNBOOK_DIST/designbook-css-daisyui/generate-[group].jsonata
```

Each file returns a **CSS string** that jsonata-w writes directly to the output file:

```jsonata
/** @config
 {
   "input": "../design-tokens.yml",
   "output": "../../css/tokens/[group].src.css"
 }
 */
(
  $entries := $each([group], function($v, $k) {
    "  --color-" & $k & ": " & $v."$value" & ";"
  });
  "@plugin \"daisyui/theme\" {\n  name: \"mytheme\";\n  default: true;\n  color-scheme: light;\n\n" & $join($entries, "\n") & "\n}\n"
)
```

**Rules for generating expressions:**
- Extract tokens from the top-level key
- For **color** tokens: generate DaisyUI theme plugin format using `--color-[name]` variables
- For **typography** tokens: generate `--font-*` variables
- Group-to-file mapping: `color` → `color.src.css`, `typography` → `font.src.css`, etc.
- **Layout and grid CSS generation** is handled by `@designbook-css-tailwind` — do NOT generate layout-width, layout-spacing, or grid `.jsonata` files here
- Return as a **string** (jsonata-w 1.0.1+ writes strings directly as raw text)

### Step 4: Generate dark theme (if applicable)

If the token file contains color mode variations, generate:

```
$DESIGNBOOK_DIST/designbook-css-daisyui/generate-dark-theme.jsonata
```

With output `../../css/themes/dark.src.css` using DaisyUI's `@plugin "daisyui/theme"` format.

## Group-to-File Mapping

| Token Group | Output File | Notes |
|-------------|-------------|-------|
| `color` | `tokens/color.src.css` | DaisyUI theme with `--color-*` variables |
| `typography` | `tokens/font.src.css` | Font families, sizes, weights |
| `spacing` | _(handled by tailwind skill)_ | See `@designbook-css-tailwind` |
| `radius` | `tokens/radius.src.css` | DaisyUI `--radius-*` variables |
| `opacity` | `tokens/opacity.src.css` | Opacity values |
| _(color modes)_ | `themes/dark.src.css` | DaisyUI plugin format |
| _(other)_ | `tokens/[group].src.css` | Auto-generated for new groups |

> Unknown groups not in the table should still generate a CSS file using the group name.

## Expected Expression Files

After expression generation, the following `.jsonata` files should exist:

```
$DESIGNBOOK_DIST/designbook-css-daisyui/
├── generate-color.jsonata
├── generate-font.jsonata
├── generate-radius.jsonata
├── generate-opacity.jsonata
└── generate-dark-theme.jsonata   (if color modes exist)
```

## CSS Output Structure

```
$DESIGNBOOK_DRUPAL_THEME/css/
├── tokens/
│   ├── color.src.css
│   ├── spacing.src.css
│   ├── font.src.css
│   ├── radius.src.css
│   └── opacity.src.css
└── themes/
    └── dark.src.css
```

## Technical Notes
- Color tokens use DaisyUI's `@plugin "daisyui/theme"` format with `--color-*` variable names
- Dark theme uses DaisyUI's `@plugin "daisyui/theme"` format with `prefersdark: true`
- Spacing tokens should include responsive media queries if breakpoint tokens are present
- Radius tokens map to DaisyUI's `--radius-selector`, `--radius-field`, `--radius-box`
- Use `npx jsonata-w inspect $DESIGNBOOK_DIST/design-tokens.yml --summary` to explore token structure
