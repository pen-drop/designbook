## Why

The Stitch integration currently imports a single design system's colors into `design-tokens.yml`. However, every Stitch design system supports both LIGHT and DARK color modes, and users may want to import additional Stitch design systems as alternative color themes. There is no mechanism to generate theme override files or produce the corresponding CSS (`@layer theme` with `[data-theme]` selectors). This change adds theme support — a default token set plus optional color-only overrides stored as `themes/*.yml` files, with automatic CSS generation for each theme.

## What Changes

- **Stitch token intake gains a theme selection step**: after choosing the default design system, the user is asked (a) whether to include dark mode (same DS, `colorMode: DARK`), and (b) whether to import additional Stitch design systems as themes.
- **Theme token files**: each selected theme produces a `themes/<name>.yml` file containing only the `semantic.color.*` deltas against the default `design-tokens.yml`.
- **CSS generation extended**: the `generate-jsonata` pipeline detects `themes/*.yml` files and produces `color.theme-<name>.src.css` files using `@layer theme { [data-theme="<name>"] { ... } }` instead of `@theme`.
- **Dark mode CSS**: the `dark` theme additionally gets a `@media (prefers-color-scheme: dark)` rule so it works automatically without JavaScript.

## Capabilities

### New Capabilities
- `theme-token-files`: Storage format and delta-computation logic for `themes/*.yml` override files (color-only, computed as diff against default)
- `theme-css-generation`: CSS generation rules for theme override files — `@layer theme` output with `[data-theme]` selectors, plus `prefers-color-scheme` for dark mode

### Modified Capabilities
- `css-mapping-convention`: The css-mapping rule needs to declare how theme override files map to CSS output (new `themeWrap` property or similar)

## Impact

- **Stitch skill** (`designbook-stitch`): `stitch-tokens.md` rule gains theme selection and delta-computation logic
- **Tailwind CSS skill** (`designbook-css-tailwind`): css-mapping rule and JSONata templates need theme-aware output format
- **Token files**: new `themes/` subdirectory under `$DESIGNBOOK_DATA/design-system/`
- **Storybook preview**: `withThemeByDataAttribute` configuration should list themes dynamically from available theme files (out of scope for this change — noted for future work)
