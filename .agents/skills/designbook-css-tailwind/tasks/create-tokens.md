---
when:
  frameworks.css: tailwind
params:
  colors: {}
  typography: {}
  type_scale: {}
  breakpoints: {}
  container_widths: {}
  section_spacing: {}
files:
  - $DESIGNBOOK_DIST/design-system/design-tokens.yml
---

# Create Design Tokens — Tailwind

Writes the approved design tokens to `$DESIGNBOOK_DIST/design-system/design-tokens.yml` in W3C Design Token YAML format with Tailwind-specific naming conventions.

## Output

```
$DESIGNBOOK_DIST/design-system/design-tokens.yml
```

## Format

All tokens use W3C Design Token format — every leaf must have `$value` and `$type`.

## Required Groups

| Group | Required | Notes |
|-------|----------|-------|
| `color` | ✅ | Semantic names: `primary`, `secondary`, `neutral`, etc. |
| `typography` | ✅ | `heading`, `body`, `mono` sub-keys (`$type: fontFamily`) |
| `layout-width` | ✅ | `sm`, `md`, `lg`, `xl` — container max-widths |
| `layout-spacing` | ✅ | `sm`, `md`, `lg` — section vertical padding |

## Optional Groups

| Group | Notes |
|-------|-------|
| `typography` (composite) | `$type: typography` tokens for type-scale (h1, h2, etc.). Generated from intake `type_scale` param. Names are free-form. |
| `breakpoints` | `$type: dimension` — responsive breakpoints. Tailwind defaults: `sm`: 640px, `md`: 768px, `lg`: 1024px, `xl`: 1280px, `2xl`: 1536px |
| `radius` | `sm`, `md`, `lg` |
| `shadow` | `sm`, `md`, `lg` |
| `grid` | `gap-sm`, `gap-md`, `gap-lg` |

## Typography Composite Tokens

When the intake `type_scale` param is provided, generate `$type: typography` composite tokens in the `typography` group alongside the `fontFamily` tokens.

**Format:**
```yaml
typography:
  # Font families (always present)
  heading:
    $value: "Space Grotesk"
    $type: fontFamily
  body:
    $value: "Inter"
    $type: fontFamily
  mono:
    $value: "JetBrains Mono"
    $type: fontFamily

  # Type scale (from type_scale param)
  h1:
    $value:
      fontFamily: "Space Grotesk"
      fontSize: "2.25rem"
      lineHeight: "2.5rem"
      fontWeight: 700
    $type: typography
  h2:
    $value:
      fontFamily: "Space Grotesk"
      fontSize: "1.875rem"
      lineHeight: "2.25rem"
      fontWeight: 700
    $type: typography
  body:
    $value:
      fontFamily: "Inter"
      fontSize: "1rem"
      lineHeight: "1.5rem"
      fontWeight: 400
    $type: typography
```

**Rules:**
- Heading-level tokens (h1, h2, h3, display, title) use the heading font family
- Body-level tokens (body, body-lg, small, caption) use the body font family
- If intake specifies a modular scale ratio, calculate sizes from a 16px base
- Token names are free-form — use whatever the user chose in intake

## Breakpoints

When the intake `breakpoints` param is provided, generate a `breakpoints` token group.

**Tailwind defaults:**
```yaml
breakpoints:
  sm:
    $value: "640px"
    $type: dimension
  md:
    $value: "768px"
    $type: dimension
  lg:
    $value: "1024px"
    $type: dimension
  xl:
    $value: "1280px"
    $type: dimension
  2xl:
    $value: "1536px"
    $type: dimension
```

## Valid `$type` Values

`color`, `fontFamily`, `dimension`, `number`, `fontWeight`, `duration`, `cubicBezier`, `shadow`, `gradient`, `transition`, `border`, `strokeStyle`, `typography`
