---
name: designbook-tokens
description: Validates and stores design tokens in W3C YAML format.
---

# Designbook Tokens Skill

> Validates and saves design tokens to `$DESIGNBOOK_DIST/design-system/design-tokens.yml`. Uses a bundled JSON Schema for structural validation via `ajv-cli`.

## Prerequisites

1. **Configuration**: Run `eval "$(node packages/storybook-addon-designbook/dist/cli.js config)"` to resolve `$DESIGNBOOK_DIST` and `$DESIGNBOOK_FRAMEWORK_CSS`
2. **CSS framework skill** (conditional):
   - If `DESIGNBOOK_FRAMEWORK_CSS` is set: Read `@designbook-css-$DESIGNBOOK_FRAMEWORK_CSS/SKILL.md` § Token Naming Conventions — token names MUST follow the framework's naming rules
   - If unset: token names are free-form

## Schema

The schema is bundled in the addon package. Token structure:

```
{top-level group}         # e.g. color, typography, spacing
  └── {token name}        # e.g. primary, heading
        ├── $value (required)   # The token value
        ├── $type (required)    # color, fontFamily, dimension, number, ...
        └── description         # Human-readable description
```

## Validation

Validate design tokens against the schema:

```bash
npx storybook-addon-designbook validate tokens
```

## Output

```
$DESIGNBOOK_DIST/design-system/design-tokens.yml
```

## Token Format (W3C Design Tokens)

Tokens are stored as W3C Design Tokens in YAML format. Each token leaf has `$value` and `$type`:

```yaml
color:
  primary:
    $value: "#4F46E5"
    $type: color
    description: Main brand color
  primary-content:
    $value: "#FFFFFF"
    $type: color
    description: Text on primary

typography:
  heading:
    $value: Space Grotesk
    $type: fontFamily
    description: Headings font
```

## Validation Rules

### ⛔ Hard Errors (schema-enforced)

1. **Not a valid object**: Token input must be a YAML object with at least one top-level group
2. **Missing `$value`**: Every token leaf MUST have a `$value` key
3. **Missing `$type`**: Every token leaf MUST have a `$type` key
4. **Invalid `$type`**: Token `$type` must be one of: `color`, `fontFamily`, `dimension`, `number`, `fontWeight`, `duration`, `cubicBezier`, `shadow`, `gradient`, `transition`, `border`, `strokeStyle`, `typography`

### ⚠️ Warnings (agent-checked)

5. **CSS framework naming mismatch** (only when `DESIGNBOOK_FRAMEWORK_CSS` is set): Color token names should match the naming conventions defined in the loaded CSS framework skill's § Token Naming Conventions
6. **Missing content counterpart** (only when the CSS framework skill requires it): Each color token should have a matching `-content` token if the framework convention demands it
