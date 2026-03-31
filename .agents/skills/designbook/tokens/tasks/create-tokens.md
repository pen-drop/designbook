---
params:
  colors: {}
  typography: {}
  type_scale: {}
  breakpoints: {}
  component_tokens: {}
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

## Token Hierarchy

All tokens live in `design-tokens.yml` organized in three fixed levels:

```yaml
primitive:        # Raw values — no references, only concrete values
  color:
    indigo-600: { $value: "#4F46E5", $type: color }
  spacing:
    4: { $value: "1rem", $type: dimension }

semantic:         # Purpose-based aliases referencing primitives
  color:
    primary: { $value: "{primitive.color.indigo-600}", $type: color }
  typography:
    heading: { $value: "Space Grotesk", $type: fontFamily }

component:        # Component-specific tokens from blueprint required_tokens
  container:
    max-width:
      lg: { $value: "1024px", $type: dimension }
```

## Instructions

1. Write `primitive` tokens from intake params (`colors`, `typography`)
2. Write `semantic` tokens referencing primitives (`colors` → semantic names, `typography` → heading/body/mono, `breakpoints`, `radius`, `shadow`)
3. Write `component` tokens from `component_tokens` param — these come from blueprint `required_tokens` and are merged under `component.*`
4. Apply renderer hints per the `renderer-hints` rule

## Required Semantic Groups

| Group | Notes |
|-------|-------|
| `color` | Semantic names; framework-specific naming via rules |
| `typography` | `heading`, `body`, `mono` sub-keys (`$type: fontFamily`) |

## Optional Semantic Groups

| Group | When | Notes |
|-------|------|-------|
| `typography` (composite) | `type_scale` param provided | `$type: typography` tokens (h1, h2, body, etc.) |
| `breakpoints` | `breakpoints` param provided | `$type: dimension` |
| `radius` | design requires it | `sm`, `md`, `lg` |
| `shadow` | design requires it | `sm`, `md`, `lg` |

## Component Tokens

The `component_tokens` param contains merged `required_tokens` from all matched blueprints. Write each entry under `component.<group>`.

**Merge rule:** Blueprint tokens provide defaults — if `component.<group>` already exists in a prior `design-tokens.yml`, keep existing values and only add missing keys.

Component tokens may reference primitives or semantics:
```yaml
component:
  grid:
    gap:
      md: { $value: "{primitive.spacing.4}", $type: dimension }
```

## Typography Composite Tokens

When the intake `type_scale` param is provided, generate `$type: typography` composite tokens in `semantic.typography` alongside the `fontFamily` tokens.

Rules:
- Heading-level tokens (h1, h2, h3, display, title) use the heading font family
- Body-level tokens (body, body-lg, small, caption) use the body font family
- If intake specifies a modular scale ratio, calculate sizes from a 16px base
- Token names are free-form — use whatever the user chose in intake

## Constraints

- Every leaf token must have `$value` and `$type`
- Colors must be hex codes
- Fonts must be exact Google Fonts names
- Valid `$type` values: `color`, `fontFamily`, `dimension`, `number`, `fontWeight`, `duration`, `cubicBezier`, `shadow`, `gradient`, `transition`, `border`, `strokeStyle`, `typography`
- Framework-specific naming rules are loaded automatically via rule files when `DESIGNBOOK_FRAMEWORK_CSS` matches
