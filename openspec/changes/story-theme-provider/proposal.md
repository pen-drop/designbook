## Why

User stories in the preview canvas have no access to the Storybook theme via `useTheme()` from `storybook/theming`. Only addon-owned pages (Foundation, Design System, Sections) receive theme context because they render through `mountReact()`, which manually wraps with `<ThemeProvider>`. Panels work because the Storybook manager provides its own ThemeProvider. Adding a preview decorator that wraps all stories in a ThemeProvider eliminates this gap and makes theme access consistent everywhere.

## What Changes

- Add a new decorator in `preview.ts` that wraps story output in a `<ThemeProvider>` using the active theme from the shared theme store
- The existing `withDeboTheme` decorator already syncs the theme to the store — the new decorator reads from it and provides React context
- `mountReact()` continues to work as before (its own ThemeProvider is harmless when nested)

## Capabilities

### New Capabilities
- `story-theme-provider`: Preview decorator that wraps all stories in a Storybook ThemeProvider, enabling `useTheme()` access in any story

### Modified Capabilities

## Impact

- `packages/storybook-addon-designbook/src/preview.ts` — new decorator added to the decorator chain
- All stories gain access to `useTheme()` from `storybook/theming`
- No breaking changes — additive only
