---
type: css-naming
name: tailwind
priority: 10
when:
  frameworks.css: tailwind
  steps: [tokens:intake, create-tokens]
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

## Palette Construction

Primitive colors are a compact raw palette — not a mirror of semantic roles. Follow these rules:

- Each hue family (blue, green, neutral, red, etc.) has **~5-8 shades** numbered by actual lightness: `50` (lightest) through `950` (darkest)
- Scale numbers reflect the color's position on the lightness axis, not its semantic role
- Keep the primitive palette **as compact as possible** without dropping values the design requires. Every primitive must be referenced by at least one semantic token — if a primitive has no semantic reference, remove it
- Multiple semantic tokens MAY reference the same primitive (e.g., `surface` and `background` can both point to `neutral-50`)
- **Never create a 1:1 mapping from semantic roles to primitives.** If the design reference provides 40 named colors, most of them are semantic — only the distinct base hues and their lightness steps become primitives

## CSS Variable Namespaces

Tailwind automatically generates utility classes for standard namespaces (`--color-*`, `--radius-*`, `--shadow-*`). Non-standard namespaces must always be used via `var()` in class values.
