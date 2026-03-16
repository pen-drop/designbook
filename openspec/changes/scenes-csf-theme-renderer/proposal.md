## Why

The current scenes loader generates Storybook docs pages for `spec.*` files and ties React rendering to Storybook's `ThemeProvider`, creating coupling that breaks in non-standard builder configurations and prevents themes from flowing naturally through the component tree. Decoupling the loader from docs generation and the renderer from Storybook internals makes scenes portable and theme-consistent.

## What Changes

- **BREAKING** — `spec.*` prefix no longer generates a docs page; all `*.scenes.yml` entries produce canvas CSF stories only
- **BREAKING** — `docsWhenPrefix` and `docsComponent` fields removed from `SceneHandler` interface
- React component rendering no longer imports from `storybook/theming`; theme is passed via a standalone context provider
- `mountReact` uses a project-level `ThemeContext` instead of `ThemeProvider` from Storybook
- Scene stories rendered via the React adapter receive the active theme through a dedicated provider wrapping the story root

## Capabilities

### New Capabilities
- `csf-only-scenes`: Scenes loader produces only canvas CSF entries; no docs page generation for any pattern prefix
- `react-theme-context`: A standalone React context (`ThemeContext`) that wraps rendered scenes and propagates the active theme down the component tree, independent of Storybook's theming APIs

### Modified Capabilities
- `scene-handlers`: Remove `docsWhenPrefix` / `docsComponent` fields; handler type is always `canvas` with no docs variant
- `unified-loader`: Remove Overview story generation and docs page output; all scenes files produce only scene stories

## Impact

- `src/renderer/scene-handlers.ts` — interface change (remove docs fields)
- `src/vite-plugin.ts` — remove Overview story branch, remove docs page injection
- `src/preset.ts` — indexer no longer emits docs entries for `spec.*` files
- `src/pages/mount-react.js` — replace `ThemeProvider` from `storybook/theming` with project `ThemeContext`
- New file: `src/renderer/theme-context.ts` (or `.tsx`) — standalone React context + provider
- Storybook builder independence: no runtime imports from `storybook/theming` or builder-specific modules in the render path
