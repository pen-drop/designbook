## Why

Theme handling is currently split across multiple layers: the Stitch integration writes themes to `design-tokens.yml`, the CSS-generate integration produces `[data-theme]` selectors, but the Storybook preview hardcodes `{ light: 'light', dark: 'dark' }` and scenes don't set `data-theme` on their root element. This means adding a new theme requires manual preview.js edits, visual compare has no deterministic theme, and there's no single source of truth for available themes at runtime.

## What Changes

- **Addon reads themes from design-tokens.yml**: The Storybook addon dynamically discovers themes from `design-tokens.yml` via the designbook API and registers `withThemeByDataAttribute` automatically. No hardcoded theme list in preview.js.
- **Scenes declare a default theme**: Each scene in `scenes.yml` can specify a `theme:` property (e.g., `light`, `dark`, `brand-x`). The scene template wraps its root element with `data-theme="{{ theme }}"`.
- **Visual compare uses scene default theme**: Screenshots render with the scene's `data-theme` already in the DOM — no `?globals=theme:` URL parameter needed.
- **Remove theme code from integration skills**: The CSS-generate workflow no longer needs to produce a `themes.js`. The `preview.js` in workspaces drops the hardcoded `withThemeByDataAttribute` decorator.
- **BREAKING**: Workspace `preview.js` files that manually configure `withThemeByDataAttribute` will be superseded by the addon's automatic setup. Existing configurations continue to work but become redundant.

## Capabilities

### New Capabilities
- `addon-theme-decorator`: Addon automatically registers theme decorator by reading themes from design-tokens.yml at runtime
- `scene-theme-default`: Scenes declare a default `theme` property that sets `data-theme` on the root element

### Modified Capabilities
- `scene-runtime`: Scene rendering wraps root element with `data-theme` attribute from scene args
- `tailwind-css-tokens`: Theme CSS files continue to produce `[data-theme]` selectors but no JS export needed

## Impact

- **Addon** (`storybook-addon-designbook`): New decorator in `preview.ts`, reads design-tokens.yml for theme list
- **Scene rendering** (`csf-prep.ts` / `renderer.ts`): Root wrapper with `data-theme` attribute
- **Workspace preview.js**: Remove manual `withThemeByDataAttribute` — addon handles it
- **Integration skills**: No theme-related JS generation needed from css-generate
- **Visual compare workflow**: Simplification — no `globals=` URL parameter for theme
