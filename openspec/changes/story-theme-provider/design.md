## Context

Storybook splits rendering into two isolated contexts: the **manager** (panels, toolbar, sidebar) and the **preview** (story canvas). The manager automatically wraps its component tree in a `<ThemeProvider>`, so `useTheme()` works in all panel components. The preview has no such provider — stories only get theme access if explicitly wrapped.

Currently, the addon's `withDeboTheme` decorator in `preview.ts` syncs the active Storybook theme into a `window.__designbook_theme__` global. The `mountReact()` helper reads from this store and wraps addon-owned pages in a `<ThemeProvider>`. User stories are left without theme context.

## Goals / Non-Goals

**Goals:**
- Make `useTheme()` from `storybook/theming` available in all stories rendered in the preview canvas
- Keep the existing `mountReact()` path working (nested ThemeProviders are harmless)

**Non-Goals:**
- Changing how the manager/panel theme works (already functional)
- Providing design-token theming (handled by `withDesignbookTheme` via `data-theme` attributes)
- Supporting custom theme objects beyond Storybook's built-in light/dark

## Decisions

### Extend `withDeboTheme` to return JSX wrapped in ThemeProvider

Instead of adding a separate decorator, extend the existing `withDeboTheme` decorator to return the story wrapped in a `<ThemeProvider>`. This decorator already computes the theme object — it just needs to wrap instead of only storing.

**Why over a separate decorator:** Fewer decorators in the chain, no ordering concerns, the theme computation already happens here. Adding a second decorator would duplicate the theme resolution logic or require reading from the store.

**Why over wrapping in `mountReact()` only:** `mountReact()` only covers addon-owned pages. A decorator covers all stories universally.

### Keep the theme store for backwards compatibility

`mountReact()` still reads from `window.__designbook_theme__`. Keep `setActiveTheme()` in place so `mountReact()` continues to work. The nested `<ThemeProvider>` from `mountReact()` is harmless — React uses the nearest provider.

## Risks / Trade-offs

- **Nested ThemeProvider for addon pages** → Harmless; React resolves to the nearest provider. No performance or behavior impact.
- **HTML-framework stories** → Stories using the HTML framework return DOM nodes, not React elements. The decorator must handle both React element returns and DOM node returns. For DOM nodes, the ThemeProvider wrapping only applies to the React render tree — vanilla HTML stories won't benefit from `useTheme()` (which is expected, as they can't use React hooks anyway).
