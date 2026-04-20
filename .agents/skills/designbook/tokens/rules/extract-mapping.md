---
trigger:
  steps: [create-tokens]
---

# Extract-Driven Token Derivation

When the `extract` param (a `DesignReference`) is present, it is the **authoritative** source for token values. Fall back to vision or user input only when extract is missing.

## Value Origin — No Invention

Values placed in `primitive.*` MUST be limited to the union of values actually observed in `extract`:

- `primitive.fontSize.*` — only values found in `extract.typography[].font_size`
- `primitive.fontWeight.*` — only values found in `extract.typography[].font_weight` (union with `extract.fonts[].weights` is allowed for declared but unused weights)
- `primitive.lineHeight.*` — computed as `line_height / font_size` from each `extract.typography[]` entry (rounded to 1 decimal); only the resulting distinct ratios
- `primitive.spacing.*` — values from `extract.tokens.spacing[]` (fall back to `extract.spacing.values[]`)
- `primitive.radius.*` — values from `extract.tokens.radii[]`
- `primitive.color.*` — union of `extract.colors[].hex` and `extract.tokens.colors` values
- `primitive.fontFamily.*` — `extract.fonts[].family` and `extract.tokens.fonts` values

Do NOT add typical-scale values (e.g. `xs`, `2xl`, `3xl`) that do not appear in the extract.

## Typography Completeness

Every entry in `extract.typography[]` MUST be represented in `semantic.typography.*`. The mapping from HTML element to semantic role is not prescribed — choose role names that reflect usage (`heading`, `display`, `body`, `link`, `button`, etc.), but coverage is mandatory.

For each role, `$value` MUST reference primitives for `fontFamily`, `fontSize`, `fontWeight`, `lineHeight`, and include `color` — either as a direct primitive reference or through a `semantic.color.*` alias derived from `extract.typography[].color`.

## Semantic Color Completeness

Every named key in `extract.tokens.colors` MUST be present in `semantic.color.*`, referencing a matching `primitive.color.*` entry.

## Non-Interactive Execution

When the workflow is invoked with a "do not ask questions" instruction, derivation runs strictly deterministically from `extract` — no inventive values, no user confirmation step. If `extract` is missing in non-interactive mode, abort with an error instead of falling back to vision.
