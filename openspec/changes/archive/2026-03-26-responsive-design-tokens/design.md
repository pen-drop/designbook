## Context

The design token system generates CSS custom properties from W3C YAML tokens via JSONata expressions. Each token group produces a `.src.css` file with `@theme { --name: value; }` blocks for Tailwind v4. There is no mechanism for viewport-dependent values — all tokens are static single values.

The existing `spacing.src.css` (manually written, not token-generated) already uses `:root` + `@media` for responsive container sizes, proving the pattern works within the current Tailwind v4 + Vite pipeline.

Affected skills: `designbook-tokens` (intake + create-tokens), `designbook-css-tailwind` (JSONata generation), and the `design-tokens.schema.yml` validator.

## Goals / Non-Goals

**Goals:**
- Add `breakpoints` and `fontSize` as first-class token groups
- Enable any dimension token to carry responsive overrides via `$extensions.responsive`
- Generate stepped `@media` queries from responsive tokens
- Extend the intake workflow to cover breakpoints, font sizes, shadows, radius, and grid
- Propose Tailwind-standard defaults for breakpoints

**Non-Goals:**
- Fluid/clamp() responsive tokens — only stepped `@media` is in scope
- Container queries — only viewport-based media queries
- Responsive support for non-dimension types (color, shadow, fontFamily)
- Visual token previews in Storybook (separate effort)
- Migrating existing hardcoded font sizes in addon components

## Decisions

### 1. Responsive format: `$extensions.responsive` with breakpoint keys

Token format for responsive values:

```yaml
fontSize:
  h1:
    $value: "1.75rem"          # mobile-first base
    $type: dimension
    $extensions:
      responsive:
        lg: "2.25rem"          # @media (min-width: breakpoints.lg)
```

Keys under `responsive` reference token names in the `breakpoints` group. `$value` is always the mobile-first default.

**Why over inline clamp():** Machine-readable, breakpoint values extractable for Storybook preview, consistent with the existing `spacing.src.css` pattern.

**Why over separate tokens per breakpoint (e.g. `h1-sm`, `h1-lg`):** One CSS variable name `--font-size-h1` that changes per viewport is cleaner than multiple variables the consumer must choose between.

### 2. Breakpoints separate from layout-width

```yaml
breakpoints:                    # @media thresholds
  sm: { $value: "640px" }
  md: { $value: "768px" }
  lg: { $value: "1024px" }
  xl: { $value: "1280px" }

layout-width:                   # container max-widths
  sm: { $value: "640px" }
  md: { $value: "768px" }
  lg: { $value: "1024px" }
  xl: { $value: "1280px" }
```

They may have the same values but serve different purposes. Breakpoints are consumed by the JSONata pipeline to resolve `$extensions.responsive` keys. Layout-widths become `--container-*` utilities.

**Why not merge:** A project may want `breakpoints.lg = 1024px` but `layout-width.lg = 960px`. Keeping them separate avoids coupling.

### 3. CSS output: `:root` + `@media` for responsive, `@theme` for static

Responsive tokens cannot use `@theme` because Tailwind v4 doesn't support `@media` inside `@theme` blocks. The pattern:

```css
/* Non-responsive token → @theme (unchanged) */
@theme {
  --font-size-body: 1rem;
}

/* Responsive token → :root + @media */
:root {
  --font-size-h1: 1.75rem;
}
@media (min-width: 1024px) {
  :root {
    --font-size-h1: 2.25rem;
  }
}
```

This matches the existing `spacing.src.css` pattern. Mixed files (some tokens responsive, some not) split into `@theme` block for static + `:root`/`@media` for responsive.

### 4. JSONata resolution: read breakpoints group at generation time

Each JSONata expression that handles responsive tokens reads the `breakpoints` group from the same `design-tokens.yml` input to resolve keys to `min-width` values. No separate config file needed.

### 5. Tailwind defaults for breakpoints

Based on Tailwind CSS v4 standard screens:

| Key | Value |
|-----|-------|
| `sm` | `640px` |
| `md` | `768px` |
| `lg` | `1024px` |
| `xl` | `1280px` |

### 6. Default fontSize scale (responsive)

| Token | Mobile | Desktop (lg) |
|-------|--------|--------------|
| `h1` | `1.75rem` | `2.25rem` |
| `h2` | `1.5rem` | `1.875rem` |
| `h3` | `1.25rem` | `1.5rem` |
| `title` | `1.125rem` | `1.25rem` |
| `body` | `1rem` | — |
| `small` | `0.875rem` | — |
| `caption` | `0.75rem` | — |

Only headings are responsive by default. Body sizes stay fixed.

## Risks / Trade-offs

- **Mixed output in one file:** A `.src.css` file containing both `@theme` and `:root` blocks works but is less clean than pure `@theme` files. → Acceptable since `spacing.src.css` already does this.
- **Breakpoint key validation:** If a responsive key doesn't match a `breakpoints` token, the JSONata expression must fail clearly. → JSONata should emit a comment/warning for unknown keys.
- **Schema complexity:** `$extensions.responsive` adds conditional validation (keys must be valid breakpoint names). → Keep schema validation simple — check structure only, validate keys at generation time.
