---
name: designbook-css-tailwind
description: Tailwind CSS v4 framework rules — structural token naming conventions (layout-width, layout-spacing, grid) and CSS token generation via @theme. Use when DESIGNBOOK_FRAMEWORK_CSS includes tailwind (directly or via daisyui).
---

# Designbook CSS Tailwind Skill

Tailwind v4-specific rules for structural design tokens and CSS generation. This skill defines naming conventions for layout-related tokens (layout-width, layout-spacing, grid) and generates `@theme` blocks using Tailwind v4's CSS-first configuration.

> This skill is loaded:
> 1. By `debo-design-tokens` workflow — for token naming conventions
> 2. By `designbook-css-generate` workflow — for CSS generation rules

> [!IMPORTANT]
> **Tailwind CSS v4 only.** This skill uses v4's CSS-first `@theme` directive for design tokens. All variables defined in `@theme` become CSS custom properties AND generate corresponding utility classes automatically — **if they use a standard Tailwind namespace**.

---

## ⛔ Styling Rules (Tailwind v4)

- **Use Tailwind's built-in spacing scale** (`p-4`, `gap-8`, `m-2`). No custom spacing tokens needed.
- **Layout widths** (`layout-width` tokens) use the standard `--container-*` namespace → auto-generates utilities
- **Layout spacing** (`layout-spacing` tokens) is a non-standard namespace → must be used via `var()`
- **Grid** tokens define gap sizes
- **No hand-written CSS** for containers, section spacing, or grid gaps

---

## Tailwind v4 Theme Variable Namespaces

In Tailwind v4, `@theme` variables are organized in **namespaces**. Each namespace auto-generates utility classes. The key distinction:

### Standard namespaces (auto-generate utilities)

| Namespace | Generated Utilities | Example |
|---|---|---|
| `--container-*` | `max-w-*`, `@container:*` | `max-w-md`, `@md:grid-cols-3` |
| `--spacing-*` | `p-*`, `m-*`, `gap-*`, `size-*` | `p-4`, `gap-8` (built-in) |
| `--color-*` | `bg-*`, `text-*`, `border-*` | `bg-red-500`, `text-primary` |
| `--font-*` | `font-*` | `font-sans`, `font-heading` |
| `--radius-*` | `rounded-*` | `rounded-lg` |
| `--shadow-*` | `shadow-*` | `shadow-md` |

### Non-standard namespaces (require `var()`)

Variables **outside** the standard namespaces do NOT auto-generate utilities. They are available as CSS custom properties only and MUST be used with `var()` or arbitrary values:

```css
/* This defines --section-spacing-md but does NOT create a py-section-md utility */
@theme {
  --section-spacing-md: 4rem;
}
```

**Usage in Twig/HTML:**

```html
<!-- Use arbitrary value syntax with var() -->
<div class="py-[var(--section-spacing-md)]">...</div>

<!-- Or in custom CSS -->
.layout { padding-block: var(--section-spacing-md); }
```

---

## 🎨 Token Naming Conventions

> **Standard Tailwind spacing** (`p-4`, `m-8`, `gap-2`, etc.) uses the built-in `--spacing-*` scale — no tokens needed. Only **layout-width**, **layout-spacing**, and **grid** are project-specific tokens.

### Layout-Width Token Names (standard namespace)

Layout-width tokens map to the `--container-*` namespace which **auto-generates** Tailwind utilities:

| Token Name | CSS Variable | Tailwind Utility | Purpose |
|---|---|---|---|
| `sm` | `--container-sm` | `max-w-sm` | Small container (640px) |
| `md` | `--container-md` | `max-w-md` | Default container (768px) |
| `lg` | `--container-lg` | `max-w-lg` | Large container (1024px) |
| `xl` | `--container-xl` | `max-w-xl` | Extra large container (1280px) |

> These are standard Tailwind v4 namespace variables — utility classes are generated automatically.

### Layout-Spacing Token Names (non-standard namespace)

Layout-spacing tokens use a **non-standard** namespace. Utility classes are NOT auto-generated — use `var()`:

| Token Name | CSS Variable | Usage | Purpose |
|---|---|---|---|
| `sm` | `--layout-spacing-sm` | `py-[var(--layout-spacing-sm)]` | Tight sections (2rem) |
| `md` | `--layout-spacing-md` | `py-[var(--layout-spacing-md)]` | Default section padding (4rem) |
| `lg` | `--layout-spacing-lg` | `py-[var(--layout-spacing-lg)]` | Hero/spacious sections (6rem) |

> ⚠️ Since `layout-spacing` is NOT a standard Tailwind namespace, you MUST use arbitrary value syntax: `py-[var(--layout-spacing-md)]`

### Grid Token Names (non-standard namespace)

Grid tokens define gap sizes for grid layouts:

| Token Name | CSS Variable | Usage | Purpose |
|---|---|---|---|
| `gap-sm` | `--grid-gap-sm` | `gap-[var(--grid-gap-sm)]` | Small grid gap (0.5rem) |
| `gap-md` | `--grid-gap-md` | `gap-[var(--grid-gap-md)]` | Default grid gap (1rem) |
| `gap-lg` | `--grid-gap-lg` | `gap-[var(--grid-gap-lg)]` | Large grid gap (2rem) |

> ⚠️ Since `grid` is NOT a standard Tailwind namespace, you MUST use arbitrary value syntax: `gap-[var(--grid-gap-md)]`

### Example Token Structures

#### Layout-width tokens

```yaml
layout-width:
  sm:
    $value: "640px"
    $type: dimension
    description: Small container max-width
  md:
    $value: "768px"
    $type: dimension
    description: Default container max-width
  lg:
    $value: "1024px"
    $type: dimension
    description: Large container max-width
  xl:
    $value: "1280px"
    $type: dimension
    description: Extra large container max-width
```

#### Layout-spacing tokens

```yaml
layout-spacing:
  sm:
    $value: "2rem"
    $type: dimension
    description: Tight sections
  md:
    $value: "4rem"
    $type: dimension
    description: Default section padding
  lg:
    $value: "6rem"
    $type: dimension
    description: Hero/spacious sections
```

#### Grid tokens

```yaml
grid:
  gap-sm:
    $value: "0.5rem"
    $type: dimension
    description: Small grid gap
  gap-md:
    $value: "1rem"
    $type: dimension
    description: Default grid gap
  gap-lg:
    $value: "2rem"
    $type: dimension
    description: Large grid gap
```

---

## Prerequisites

- Called by `designbook-css-generate` — all environment variables are already set
- `DESIGNBOOK_DIST` and `DESIGNBOOK_DRUPAL_THEME` are available

## Capability

### Generate Expression Files

**Trigger**: Called by `designbook-css-generate` step 3.

**Action**: Generate `.jsonata` expression files that produce Tailwind v4 `@theme` blocks.

### Step 1: Ensure expression directory

```bash
mkdir -p $DESIGNBOOK_DIST/designbook-css-tailwind
```

### Step 2: Inspect token structure

```bash
npx jsonata-w inspect $DESIGNBOOK_DIST/design-tokens.yml --summary
```

### Step 3: Generate `.jsonata` expression files

For each structural group (`layout-width`, `layout-spacing`, `grid`), create:

```
$DESIGNBOOK_DIST/designbook-css-tailwind/generate-[group].jsonata
```

Each file returns a CSS string using Tailwind v4 `@theme`:

```jsonata
/** @config
 {
   "input": "../design-tokens.yml",
   "output": "../../css/tokens/[group].src.css"
 }
 */
(
  $entries := $each([group], function($v, $k) {
    "  --[prefix]-" & $k & ": " & $v."$value" & ";"
  });
  "@theme {\n" & $join($entries, "\n") & "\n}\n"
)
```

**CSS variable prefix per group:**

| Token Group | CSS Variable Prefix | Standard Namespace? | Example Output |
|---|---|---|---|
| `layout-width` | `--container-` | ✅ Yes | `--container-md: 768px;` |
| `layout-spacing` | `--layout-spacing-` | ❌ No | `--layout-spacing-md: 4rem;` |
| `grid` | `--grid-` | ❌ No | `--grid-gap-md: 1rem;` |

## Group-to-File Mapping

| Token Group | Output File | Notes |
|---|---|---|
| `layout-width` | `tokens/layout-width.src.css` | Container max-widths via `@theme` (maps to `--container-*`) |
| `layout-spacing` | `tokens/layout-spacing.src.css` | Section vertical rhythm via `@theme` (use with `var()`) |
| `grid` | `tokens/grid.src.css` | Grid gap sizes via `@theme` (use with `var()`) |
| _(other)_ | `tokens/[group].src.css` | Auto-generated for unknown groups |

## CSS Output Structure

```
$DESIGNBOOK_DRUPAL_THEME/css/
└── tokens/
    ├── layout-width.src.css
    ├── layout-spacing.src.css
    └── grid.src.css
```

## Tailwind v4 Quick Reference

Key differences from v3:

| Feature | v3 | v4 |
|---|---|---|
| Config | `tailwind.config.js` | `@theme` in CSS |
| Variables | Generated from config | Native CSS custom properties |
| Extending | `theme.extend` in JS | Add to `@theme` block |
| Overriding | `theme` in JS | `--namespace-*: initial;` in `@theme` |
| Non-standard tokens | Not possible | Define in `@theme`, use with `var()` |
| Imports | `@tailwind base/components/utilities` | `@import "tailwindcss"` |
