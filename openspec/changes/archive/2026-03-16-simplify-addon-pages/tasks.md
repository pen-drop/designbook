## 1. Delete page-field YAML files

- [x] 1.1 Delete `packages/storybook-addon-designbook/src/pages/foundation.scenes.yml`
- [x] 1.2 Delete `packages/storybook-addon-designbook/src/pages/design-system.scenes.yml`
- [x] 1.3 Delete `packages/storybook-addon-designbook/src/pages/sections-overview.scenes.yml`
- [x] 1.4 Remove `packages/storybook-addon-designbook/src/pages/spec.shell.scenes.yml` from git index (`git rm --cached`) — file is already deleted on disk

## 2. Add real CSF story files

- [x] 2.1 Create `src/pages/foundation.stories.jsx` — imports `DeboFoundationPage`, exports default meta (`title: 'Designbook/Foundation'`, `tags: ['!dev']`, `parameters.layout: 'fullscreen'`, `parameters.docs.page`, `parameters.designbook.order: 0`) and named export `Foundation`
- [x] 2.2 Create `src/pages/design-system.stories.jsx` — same structure for `DeboDesignSystemPage`, `title: 'Designbook/Design System'`, `order: 1`, export `DesignSystem`
- [x] 2.3 Create `src/pages/sections-overview.stories.jsx` — same structure for `DeboSectionsOverview`, `title: 'Designbook/Sections/Overview'`, `order: 2`, export `SectionsOverview`

## 3. Simplify vite-plugin.ts

- [x] 3.1 Remove the `page`-field detection block from the `load()` hook (lines that read YAML and call `buildPageModule()`)
- [x] 3.2 Delete `buildPageModule()` function — note: `buildDocsPage`, `injectDocsPage`, `buildDocsOnlyModule`, `extractPageType`, `capitalize` are still used by `loadSceneModule()` for section files and MUST NOT be deleted

## 4. Simplify preset.ts

- [x] 4.1 Remove the `page`-field branch from `experimental_indexers` (the `if (typedParsed.page)` block)
- [x] 4.2 Update `builtinPagesGlob` in `stories()` from `src/pages/*.scenes.yml` to `src/pages/*.stories.jsx` (pointing at `dist/pages/*.stories.jsx`)

## 5. Verify

- [x] 5.1 Run `pnpm build` — no TypeScript or build errors
- [ ] 5.2 Start Storybook in the test integration and confirm Foundation, Design System, and Sections Overview pages appear correctly
- [x] 5.3 Run lint (`cd packages/storybook-addon-designbook && npx eslint --cache --fix . && cd ../.. && npm run lint`) — no errors
