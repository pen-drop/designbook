## Why

The design token system currently has no `fontSize` or `breakpoints` token groups, and no way to express responsive values. Font sizes are hardcoded in `DeboDesignTokens.jsx` (a static `TYPE_SCALE` array), and dimension tokens like `grid.gap-md` or `layout-spacing.md` produce a single static CSS variable regardless of viewport. The token intake workflow (`/debo-design-tokens`) doesn't ask about font sizes, breakpoints, shadows, radius, or grid gaps — so these tokens either don't exist or must be added manually.

## What Changes

- Add `breakpoints` as a new required token group (`sm`, `md`, `lg`, `xl`) — these define `@media (min-width)` thresholds, separate from `layout-width` (container max-widths)
- Add `fontSize` as a new required token group with a type scale (h1–caption)
- Introduce `$extensions.responsive` on any dimension token — a map of breakpoint keys to values, generating stepped `@media` queries instead of a single `@theme` variable
- Update the token intake workflow to ask about breakpoints, font sizes (with responsive defaults), shadows, radius, and grid gaps
- Update `create-tokens.md` to document the new groups and `$extensions.responsive` format
- Extend the design-tokens schema to validate `$extensions.responsive`
- Update/create JSONata expressions to handle responsive tokens (`:root` + `@media` instead of `@theme`)
- Tailwind defaults for breakpoints: `sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`

## Capabilities

### New Capabilities
- `responsive-tokens`: Support for `$extensions.responsive` on dimension tokens — stepped `@media` generation from breakpoint-keyed value maps
- `breakpoint-tokens`: New `breakpoints` token group defining viewport thresholds, referenced by responsive tokens
- `font-size-tokens`: New `fontSize` token group with responsive type scale

### Modified Capabilities
- `tailwind-css-tokens`: Add breakpoint and fontSize token naming conventions, responsive CSS generation via `:root` + `@media` instead of `@theme` for responsive tokens

## Impact

- **Skills**: `designbook-tokens` (intake.md, create-tokens.md, SKILL.md), `designbook-css-tailwind` (JSONata expressions, task docs)
- **Schema**: `design-tokens.schema.yml` — add `$extensions.responsive` validation
- **CSS pipeline**: Responsive tokens produce `:root { ... } @media (...) { :root { ... } }` instead of `@theme { ... }`
- **Test integration**: `design-tokens.yml` gets new `breakpoints` and `fontSize` groups; existing tokens can optionally gain `$extensions.responsive`
