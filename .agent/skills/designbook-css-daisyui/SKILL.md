---
name: designbook-css-daisyui
description: DaisyUI framework rules — Tailwind-only styling and CSS token generation from W3C Design Tokens. Use when DESIGNBOOK_CSS_FRAMEWORK is daisyui.
---

# Designbook CSS DaisyUI

DaisyUI-specific rules for styling and CSS token generation. This skill defines the styling constraints for the DaisyUI framework and generates `.jsonata` expression files that produce DaisyUI-compatible CSS.

> **This skill is NOT called directly** — it is invoked by `designbook-css-generate` as the framework-specific delegate.

## ⚠️ Styling Rules — Tailwind Classes Only

When `DESIGNBOOK_CSS_FRAMEWORK` is `daisyui`, **all styling MUST use Tailwind CSS utility classes and DaisyUI component classes exclusively**. No custom CSS is allowed.

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
npx jsonata-w inspect $DESIGNBOOK_DIST/design-tokens.json --summary
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
   "input": "../design-tokens.json",
   "output": "../../css/tokens/[group].src.css"
 }
 */
(
  $entries := $each([group], function($v, $k) {
    "  --[group]-" & $k & ": " & $v."$value" & ";"
  });
  ":root {\n" & $join($entries, "\n") & "\n}\n"
)
```

**Rules for generating expressions:**
- Extract tokens from the top-level key
- Transform each token into a CSS custom property: `--[group]-[name]: [value];`
- Wrap in `:root { }` block
- Return as a **string** (jsonata-w 1.0.1+ writes strings directly as raw text)
- For **color** tokens: generate DaisyUI-compatible color variables
- For **typography** tokens: generate `--font-*` variables
- Group-to-file mapping: `color` → `color.src.css`, `typography` → `font.src.css`, etc.

### Step 4: Generate dark theme (if applicable)

If the token file contains color mode variations, generate:

```
$DESIGNBOOK_DIST/designbook-css-daisyui/generate-dark-theme.jsonata
```

With output `../../css/themes/dark.src.css` using DaisyUI's `@plugin "daisyui/theme"` format.

## Group-to-File Mapping

| Token Group | Output File | Notes |
|-------------|-------------|-------|
| `color` | `tokens/color.src.css` | Primitives + light theme |
| `typography` | `tokens/font.src.css` | Font families, sizes, weights |
| `spacing` | `tokens/spacing.src.css` | With responsive media queries |
| `radius` | `tokens/radius.src.css` | Border radius values |
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
├── generate-spacing.jsonata
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
- Color tokens combine primitives and light theme in a single file
- Dark theme uses DaisyUI's `@plugin "daisyui/theme"` format
- Spacing tokens should include responsive media queries if breakpoint tokens are present
- Use `npx jsonata-w inspect $DESIGNBOOK_DIST/design-tokens.json --summary` to explore token structure
