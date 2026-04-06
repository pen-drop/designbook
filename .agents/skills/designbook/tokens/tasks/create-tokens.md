---
when:
  steps: [create-tokens]
params:
  intake: {}
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

1. **Read naming conventions** — read the css-naming blueprint from `task.blueprints[]` filtered by `type: css-naming` for token group names, sub-key conventions, and CSS variable mapping
2. **Primitive tokens** — for each group in `intake`, write raw values under `primitive.<group>`. Sub-key naming follows the css-naming blueprint loaded in step 1.
3. **Semantic tokens** — create purpose-based aliases referencing primitives (e.g., `color` → `primary`/`secondary`, `typography` → `heading`/`body`/`mono`). Semantic tokens MUST reference primitives via `{primitive.<group>.<key>}` — no raw values in semantics.
4. **Component tokens** — read `required_tokens` from each matched blueprint file and write them under `component.<group>`. These are defaults — if `component.<group>` already exists in a prior `design-tokens.yml`, keep existing values and only add missing keys
5. Apply renderer hints per the `renderer-hints` rule

## Intake Param

The `intake` param is a free-form object whose keys are token groups gathered during intake (e.g., `colors`, `typography`, `breakpoints`, `type_scale`). The set of groups is not fixed — process whatever the intake provides.

## Component Tokens from Blueprints

Each matched blueprint declares `required_tokens` in its frontmatter. Read these and write under `component.*`.

Component tokens may reference primitives or semantics:
```yaml
component:
  grid:
    gap:
      md: { $value: "{primitive.spacing.4}", $type: dimension }
```

## Typography Composite Tokens

When `intake` contains a `type_scale` group, generate `$type: typography` composite tokens in `semantic.typography` alongside any `fontFamily` tokens.

## Constraints

- Every leaf token must have `$value` and `$type`
- Colors must be hex codes
- Valid `$type` values: `color`, `fontFamily`, `dimension`, `number`, `fontWeight`, `duration`, `cubicBezier`, `shadow`, `gradient`, `transition`, `border`, `strokeStyle`, `typography`
