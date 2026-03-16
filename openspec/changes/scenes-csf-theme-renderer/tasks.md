## 1. Theme store + decorator

- [ ] 1.1 Create `src/pages/theme-store.ts`: export `getActiveTheme()` and `setActiveTheme(theme)`; default value is `themes.light` from `storybook/theming`
- [ ] 1.2 Add `withDeboTheme` decorator to `src/preview.ts`: import `useGlobals` from `storybook/preview-api`; pick `themes.dark` when `globals.theme === 'dark'`, else `themes.light`; merge Debo tokens on top; call `setActiveTheme(merged)`; return `Story(context)`
- [ ] 1.3 Update `src/pages/mount-react.js`: replace `ThemeProvider` with `themes.light` import with `getActiveTheme()` from `theme-store`; keep `ThemeProvider` wrapping but use the store value

## 2. Remove docs generation from SceneHandler

- [ ] 2.1 Update `SceneHandler` interface in `src/renderer/scene-handlers.ts`: remove `docsWhenPrefix` and `docsComponent` fields
- [ ] 2.2 Update `defaultHandlers` array: remove `docsWhenPrefix` and `docsComponent` from the `.scenes.yml` entry
- [ ] 2.3 Update `matchHandler` return type: remove `hasDocs` field from the result (always false now)

## 3. Remove docs/Overview output from unified loader

- [ ] 3.1 Update `src/vite-plugin.ts`: remove the `spec.*` prefix branch that generates an Overview story
- [ ] 3.2 Update `src/vite-plugin.ts`: remove docs page injection (`parameters.docs`) from the default export CSF object
- [ ] 3.3 Update `src/preset.ts`: remove `type: 'docs'` index entry emission for `spec.*` files; indexer emits only `type: 'story'` entries

## 4. Convert pages/*.stories.jsx to canvas CSF

- [ ] 4.1 Update `src/pages/foundation.stories.jsx`: remove `docs: { page: ... }` parameter; add `render` function using `mountReact(DeboFoundationPage)`
- [ ] 4.2 Update `src/pages/design-system.stories.jsx`: remove `docs: { page: ... }` parameter; add `render` function using `mountReact(DeboDesignSystemPage)`
- [ ] 4.3 Update `src/pages/sections-overview.stories.jsx`: remove `docs: { page: ... }` parameter; add `render` function using `mountReact(DeboSectionsOverview)`

## 5. Verification

- [ ] 5.1 Run `npm run test` (or vitest) — all renderer tests pass
- [ ] 5.2 Run linter: `cd packages/storybook-addon-designbook && npx eslint --cache --fix . && cd ../..`
- [ ] 5.3 Verify in Storybook: Foundation, Design System, and Sections Overview render on the Canvas tab without errors
- [ ] 5.4 Verify: `spec.*` scenes files no longer show a docs tab entry in Storybook sidebar
