---
params:
  colors: {}
  typography: {}
  type_scale: {}
  breakpoints: {}
files:
  - file: $DESIGNBOOK_DATA/design-system/design-tokens.yml
    key: design-tokens
    validators: [tokens]
---

# Create Design Tokens

Write the result in W3C Design Token YAML format via stdin to the CLI:
```
write-file $WORKFLOW_NAME $TASK_ID --key design-tokens
```

## Format

All tokens use W3C Design Token format — every leaf must have `$value` and `$type`:

```yaml
color:
  primary:
    $value: "#4F46E5"
    $type: color
    description: Main brand color

typography:
  heading:
    $value: "DM Sans"
    $type: fontFamily
```

## Required Groups

| Group | Required | Notes |
|-------|----------|-------|
| `color` | ✅ | Semantic names; framework-specific naming via rules |
| `typography` | ✅ | `heading`, `body`, `mono` sub-keys (`$type: fontFamily`) |

## Optional Groups

| Group | When | Notes |
|-------|------|-------|
| `typography` (composite) | `type_scale` param provided | `$type: typography` tokens for type scale (h1, h2, body, etc.) |
| `breakpoints` | `breakpoints` param provided | `$type: dimension` — responsive breakpoints |
| `radius` | design requires it | `sm`, `md`, `lg` |
| `shadow` | design requires it | `sm`, `md`, `lg` |

> **Note:** Layout tokens (spacing, container widths, grid gaps) are component-level tokens defined by blueprints, not global design tokens. See blueprint files in `skills/*/blueprints/` for layout token definitions.

## Typography Composite Tokens

When the intake `type_scale` param is provided, generate `$type: typography` composite tokens in the `typography` group alongside the `fontFamily` tokens.

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
  body-lg:
    $value:
      fontFamily: "Inter"
      fontSize: "1.125rem"
      lineHeight: "1.75rem"
      fontWeight: 400
    $type: typography
```

Rules:
- Heading-level tokens (h1, h2, h3, display, title) use the heading font family
- Body-level tokens (body, body-lg, small, caption) use the body font family
- If intake specifies a modular scale ratio, calculate sizes from a 16px base
- Token names are free-form — use whatever the user chose in intake

## Valid `$type` Values

`color`, `fontFamily`, `dimension`, `number`, `fontWeight`, `duration`, `cubicBezier`, `shadow`, `gradient`, `transition`, `border`, `strokeStyle`, `typography`

> Framework-specific naming rules (e.g. DaisyUI semantic colors, Tailwind breakpoint defaults) are loaded automatically via rule files when `DESIGNBOOK_FRAMEWORK_CSS` matches.
