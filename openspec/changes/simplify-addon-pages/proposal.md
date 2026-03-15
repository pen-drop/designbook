## Why

The addon's internal pages (Foundation, Design System, Sections Overview) are defined as `.scenes.yml` files with a `page` field, which get transformed into CSF modules via `buildPageModule()` in the vite-plugin. This requires a `resolveId` hack to make Vite treat `.yml` files as JS modules, and adds unnecessary complexity to the plugin. These pages have no scenes — they're just React component wrappers. Real CSF files would be simpler and natively supported by Storybook.

## What Changes

- Replace `dist/pages/*.scenes.yml` with `dist/pages/*.stories.jsx` (real CSF files)
- Remove `buildPageModule()` from `vite-plugin.ts`
- Remove the `page`-field detection logic from the `load()` hook
- Remove the `resolveId` hack for `.scenes.yml` imports from outside designbookDir
- Remove `page`-field indexing logic from `preset.ts` (the scenesIndexer)
- Update Storybook config to include `dist/pages/*.stories.jsx` via `stories` globs
- Keep `.scenes.yml` for sections and shell (user content with actual scenes + metadata)

## Capabilities

### New Capabilities

- `addon-csf-pages`: Real CSF story files for addon internal pages (Foundation, Design System, Sections Overview), replacing the YAML-to-CSF generation pipeline.

### Modified Capabilities

- `unified-loader`: The vite-plugin `load()` hook no longer needs to handle `page`-field YAML files. Simplification only.
- `scene-handlers`: No longer needs to account for page-only files without scenes.

## Impact

- `packages/storybook-addon-designbook/src/vite-plugin.ts` — remove `buildPageModule()`, simplify `resolveId` and `load()`
- `packages/storybook-addon-designbook/src/preset.ts` — remove page-field indexing branch
- `packages/storybook-addon-designbook/src/pages/` — replace `.scenes.yml` with `.stories.jsx`
- `packages/storybook-addon-designbook/tsup.config.ts` — may need to adjust the `onSuccess` copy command
- `packages/integrations/test-integration-drupal/.storybook/main.js` — stories glob already includes `dist/pages`
