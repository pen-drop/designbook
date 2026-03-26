## Why

The tokens page in `DeboDesignTokens.jsx` only has specialized visual renderers for `color` and `fontFamily` tokens. All other token types (`shadow`, `dimension`, `number`, `fontWeight`, `gradient`, `border`, `duration`, `cubicBezier`, `transition`, `strokeStyle`) fall through to a generic key:value text list with no visual preview. Additionally, the typography type-scale display uses hardcoded font sizes instead of reading from actual token data — the `TYPE_SCALE` constant pretends to show real data but is static.

## What Changes

- **Remove hardcoded `TYPE_SCALE`** from `DeboDesignTokens.jsx` and replace with data-driven rendering from `$type: typography` composite tokens
- **Extend `design-tokens.yml` format** to include `$type: typography` composite tokens (W3C standard) for type-scale definitions (h1, h2, h3, body, caption, etc.)
- **Add a token renderer registry** — a `$type` → Component mapping that selects the correct visual renderer per token type
- **Add specialized renderers** for Tier 1 types: `typography` (composite), `dimension`, `shadow`
- **Add specialized renderers** for Tier 2 types: `number`, `fontWeight`, `gradient`, `border`
- **Add specialized renderers** for Tier 3 types: `duration`, `cubicBezier`, `transition`, `strokeStyle`
- **Update `debo-design-tokens` skill** (`create-tokens.md`) to generate type-scale tokens in the typography group
- Unknown/future `$type` values gracefully fall back to the existing generic renderer

## Capabilities

### New Capabilities
- `token-type-renderers`: Registry-based visual rendering system for all W3C design token types in DeboDesignTokens, replacing the current name-based group dispatching with `$type`-based renderer selection
- `typography-composite-tokens`: Support for `$type: typography` composite tokens in design-tokens.yml, including schema validation, skill generation, and visual rendering as a type-scale table

### Modified Capabilities
- `tailwind-css-tokens`: CSS generation must handle `$type: typography` composite tokens (fontFamily, fontSize, lineHeight, fontWeight, letterSpacing)

## Impact

- **`DeboDesignTokens.jsx`**: Major refactor — replace hardcoded color/typography branching with registry pattern, remove `TYPE_SCALE` constant, add ~10 new renderer components
- **`design-tokens.schema.yml`**: Extend `$value` validation for `$type: typography` to accept object values with fontFamily/fontSize/lineHeight/fontWeight/letterSpacing
- **`create-tokens.md`** (designbook-tokens skill): Add type-scale section to typography group, update required groups table
- **`design-tokens.yml`** (test-integration-drupal): Add example typography composite tokens
- **CSS generation skills**: Tailwind/DaisyUI token generation must map typography composites to CSS custom properties or utility classes
