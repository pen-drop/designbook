## Context

The Designbook addon currently generates Storybook docs pages for `spec.*` scene files by injecting a docs CSF entry alongside the canvas entries. React component rendering in scenes uses `ThemeProvider` and `themes` from `storybook/theming`, which are builder-coupled and can break in non-standard Storybook configurations (e.g., Storybook 9+, custom builders, or framework-less setups).

Two related problems:
1. The `SceneHandler` interface and `unified-loader` have docs-generation logic that is never exercised for non-spec scenes and creates a hard dependency on docs infrastructure.
2. `mountReact` (used by React-adapter scenes and by `pages/*.stories.jsx`) hardcodes `themes.light` from `storybook/theming`, so theme doesn't cascade through the component tree. The `Debo*` components themselves use `useTheme()` from `storybook/theming` and expect the theme to be provided by an ancestor — but no consistent provider exists in the canvas render path.

## Goals / Non-Goals

**Goals:**
- Remove docs-page generation from the scenes loader entirely; every scene story is a canvas entry
- A global preview decorator provides `ThemeProvider` for all stories, tracking the current Storybook UI theme (light/dark) via `useGlobals()`
- The Debo theme token object is merged on top of the active Storybook base theme; `Debo*` components receive both via `useTheme()`
- `mountReact` is simplified — no longer responsible for theme provision
- `pages/*.stories.jsx` converted from docs-only to canvas CSF stories

**Non-Goals:**
- Removing the docs tab from Storybook globally (that's a Storybook config concern)
- Supporting multiple simultaneous themes per scene
- Adding a theme switcher UI (that can be a separate change)

## Decisions

### Decision: Remove docs generation from `SceneHandler`, not from a config flag

**Rationale:** Making it opt-out via a config flag would perpetuate the coupling and create more code paths to test. The docs page for spec sections was never part of the scenes renderer spec — it was a convenience feature that now conflicts with builder independence. Removing it entirely is the cleanest break.

**Alternatives considered:**
- `docsEnabled: false` flag on handler — rejected: adds code paths, doesn't remove the builder dependency
- Keep docs for spec.* but make it optional per project — rejected: too much complexity for little benefit; MDX-based docs pages are the correct long-term approach

### Decision: Module-level theme store updated by decorator, read by mountReact

**Rationale:** The integration uses `@storybook/html-vite` (HTML framework). In the HTML framework, decorators return DOM elements — there is no outer React tree, so a `ThemeProvider` decorator cannot provide React context to `mountReact`'s inner React root. A module-level store solves this: the decorator (which runs before the story render and has access to `useGlobals()`) writes the current theme into the store; `mountReact` reads the store when creating its React root.

**How it works:**
```ts
// src/pages/theme-store.ts
import { themes } from 'storybook/theming';
let _theme = themes.light;
export const setActiveTheme = (t) => { _theme = t; };
export const getActiveTheme = () => _theme;

// src/preview.ts — decorator
import { useGlobals } from 'storybook/preview-api';
import { themes } from 'storybook/theming';
import { setActiveTheme } from './pages/theme-store';

(Story, context) => {
  const [globals] = useGlobals();
  const base = globals.theme === 'dark' ? themes.dark : themes.light;
  setActiveTheme({ ...base, ...deboTokens });
  return Story();
}

// src/pages/mount-react.js
import { ThemeProvider } from 'storybook/theming';
import { getActiveTheme } from './theme-store';

export function mountReact(Component, props = {}) {
  const el = document.createElement('div');
  ReactDOM.createRoot(el).render(
    React.createElement(ThemeProvider, { theme: getActiveTheme() },
      React.createElement(Component, props))
  );
  return el;
}
```

When the user changes the theme in the Storybook UI, globals change → Storybook re-runs the story → decorator updates the store → `mountReact` creates a new root with the updated theme. Fully reactive without hooks in `mountReact`.

`deboTokens` is loaded at build time from the project's design token config.

**Alternatives considered:**
- Decorator wraps `<ThemeProvider>` around `<Story>` — rejected: HTML framework decorators return DOM elements, not React elements; there is no outer React tree for `ThemeProvider` to inhabit
- Hardcode `themes.light` in `mountReact` — rejected: doesn't track the active Storybook UI theme; Debo tokens never reach components

## Risks / Trade-offs

- **[Risk]** Existing projects relying on the auto-generated docs page for `spec.*` files will lose it on upgrade → **Mitigation**: Document in changelog; users can add MDX files manually or re-run `/debo-sections` which will generate proper MDX docs
- **[Risk]** Storybook upgrades may change the globals key used for theme — `globals.theme` is not a stable Storybook API → **Mitigation**: Fall back to `themes.light` if the globals key is absent; document the globals key in the addon config
- **[Risk]** Storybook upgrades may change the shape of `themes.light`, causing spread-merged Debo tokens to conflict with new Storybook keys → **Mitigation**: Debo tokens should use namespaced keys (e.g., `debo.*`) to avoid collisions
- **[Trade-off]** Canvas-only stories means the Docs tab for scenes files will be empty/default instead of a custom overview — acceptable because the Docs tab was only useful for the `spec.*` pattern, which is rare

## Migration Plan

1. Update `SceneHandler` interface — remove `docsWhenPrefix`, `docsComponent`
2. Update `defaultHandlers` — remove docs fields from the default registry entry
3. Update `vite-plugin.ts` — remove Overview story generation branch and docs page injection
4. Update `preset.ts` — indexer emits only canvas entries for all scene files
5. Create `src/pages/theme-store.ts` — module-level `getActiveTheme()` / `setActiveTheme()`, defaulting to `themes.light`
6. Add `withDeboTheme` decorator to `src/preview.ts` — reads `useGlobals()` for `globals.theme`, merges Debo tokens, calls `setActiveTheme()`
7. Update `src/pages/mount-react.js` — replace hardcoded `themes.light` with `getActiveTheme()` from theme store

No data migrations required. Scene YAML files are unchanged.

