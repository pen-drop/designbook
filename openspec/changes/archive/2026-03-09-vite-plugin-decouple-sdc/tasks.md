## 1. Extract shared scene metadata

- [x] 1.1 Create `src/renderer/scene-metadata.ts` with `extractGroup()`, `buildExportName()`, `extractScenes()`
- [x] 1.2 Add unit tests in `src/renderer/__tests__/scene-metadata.test.ts`
- [x] 1.3 Refactor `preset.ts` scenesIndexer to use `scene-metadata.ts`
- [x] 1.4 Refactor `vite-plugin.ts` `loadScenesYml` to use `scene-metadata.ts`

## 2. Move SDC concerns into renderer layer

- [x] 2.1 Move import tracking (`trackImport`) from `loadScenesYml` into `sdc-module-builder.ts`
- [x] 2.2 Move entity marker resolution (`__ENTITY_EXPR__` pipeline) from `loadScenesYml` into `sdc-module-builder.ts`
- [x] 2.3 Move CSF module generation (`TwigSafeArray`, `Drupal.attachBehaviors()`, imports) into `sdc-module-builder.ts`
- [x] 2.4 Reduce `loadScenesYml` to: YAML parse → null guard → delegate to `buildSdcModule` → transform with esbuild

## 3. Cleanup

- [x] 3.1 Delete `src/withGlobals.ts`
- [x] 3.2 Remove unused imports from `vite-plugin.ts` (jsonata, parseScene, SceneNodeRenderService, sdcRenderers, type imports)

## 4. Verification

- [x] 4.1 Run `npm run build` — no TypeScript errors ✓
- [x] 4.2 Run existing unit tests — 61/61 passed ✓
- [x] 4.3 Storybook dev starts, all scenes + sections indexed ✓
- [x] 4.4 Verified sidebar and scene rendering in browser ✓
