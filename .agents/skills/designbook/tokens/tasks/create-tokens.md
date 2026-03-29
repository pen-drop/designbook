---
params:
  colors: {}
  typography: {}
  container_widths: {}
  section_spacing: {}
files:
  - file: $DESIGNBOOK_DATA/design-system/design-tokens.yml
    key: design-tokens
    validators: [tokens]
# Fallback: applies when no CSS framework-specific task file matches.
# Framework-specific versions (e.g. designbook-css-daisyui/tasks/create-tokens.md)
# take precedence when their `when` conditions match.
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

layout-width:
  md:
    $value: "768px"
    $type: dimension

layout-spacing:
  md:
    $value: "4rem"
    $type: dimension
```

## Required Groups

| Group | Required | Notes |
|-------|----------|-------|
| `color` | ✅ | Framework-specific names if CSS framework is set |
| `typography` | ✅ | `heading`, `body`, `mono` sub-keys |
| `layout-width` | ✅ | `sm`, `md`, `lg`, `xl` — maps from dialog "container widths" |
| `layout-spacing` | ✅ | `sm`, `md`, `lg` — maps from dialog "section spacing" |
| `grid` | ❌ optional | `gap-sm`, `gap-md`, `gap-lg` |

## Full Example (Generic)

```yaml
color:
  primary:
    $value: "#4F46E5"
    $type: color
    description: Main brand color
  secondary:
    $value: "#7C3AED"
    $type: color
    description: Secondary accent
  neutral:
    $value: "#6B7280"
    $type: color
    description: Neutral UI

typography:
  heading:
    $value: "Space Grotesk"
    $type: fontFamily
  body:
    $value: "Inter"
    $type: fontFamily
  mono:
    $value: "JetBrains Mono"
    $type: fontFamily

layout-width:
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

## Valid `$type` Values

`color`, `fontFamily`, `dimension`, `number`, `fontWeight`, `duration`, `cubicBezier`, `shadow`, `gradient`, `transition`, `border`, `strokeStyle`, `typography`

> CSS framework naming rules (e.g. DaisyUI semantic color names) are loaded automatically via rule files when `DESIGNBOOK_FRAMEWORK_CSS` matches.
