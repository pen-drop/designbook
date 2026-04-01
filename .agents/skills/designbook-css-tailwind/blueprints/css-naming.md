---
type: css-naming
name: tailwind
priority: 10
when:
  frameworks.css: tailwind
  steps: [tokens:intake]
---

# Tailwind Token Naming Rules

## Token Layers

Tokens are organized in three layers that build on each other:

### Primitive Tokens

Primitive tokens correspond to standard Tailwind tokens. They define raw values without meaning. Color values are concrete hex values. Color scale keys use Tailwind-conformant hue-plus-scale notation. These tokens are never used directly in markup — they serve only as the basis for semantic tokens.

### Semantic Tokens

Semantic tokens describe purpose and intent, not concrete values. They always reference primitives — never direct values.

- **Sizes** use t-shirt sizes: `sm`, `md`, `lg`, `xl` (and `full` for radii)
- **Colors** use role-based names that describe the intended use

Semantic color names are purpose-oriented (e.g. foreground, background, accent, outline, inverse surface). Semantic sizes apply to spacing, radii, shadows, and layout dimensions.

### Component Tokens

Component tokens are component-specific and reference semantic tokens. They form the third layer and encapsulate component-internal design decisions.

## CSS Variable Namespaces

Tailwind automatically generates utility classes for standard namespaces (`--color-*`, `--radius-*`, `--shadow-*`). Non-standard namespaces must always be used via `var()` in class values.
