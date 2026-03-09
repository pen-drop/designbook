## Why

`vite-plugin.ts` has grown to 496 lines with Twig/SDC rendering logic hardcoded into the scene loader (`loadScenesYml`). Import tracking, component path resolution (`../components/{name}/{name}.component.yml`), and `Drupal.attachBehaviors()` are all SDC-specific but live in framework-agnostic code. Additionally, scene metadata logic (group name extraction, export name generation) is duplicated between `vite-plugin.ts` and `preset.ts`.

This blocks React/Vue adapter support described in the `screen-renderer` spec and makes the plugin harder to maintain.

## What Changes

- **Extract shared scene metadata logic** into a shared module used by both `preset.ts` (indexer) and `vite-plugin.ts` (loader) — group name derivation, export name generation, `scenes[]` array handling
- **Move SDC-specific rendering out of `loadScenesYml`** — import tracking, component path resolution, `Drupal.attachBehaviors()`, Twig-specific code generation → into the SDC adapter/renderer
- **Make `loadScenesYml` adapter-agnostic** — it should call the render service for all framework-specific concerns including import tracking and code generation
- **Remove dead code** — `withGlobals.ts` (unused boilerplate from addon kit)

## Capabilities

### New Capabilities
- `scene-metadata`: Shared scene metadata extraction (group, exportName, scenes array parsing) used by both indexer and loader

### Modified Capabilities
- `screen-renderer`: Decouple SDC-specific rendering from `loadScenesYml` into the render service, fulfilling the adapter interface described in the existing spec

## Impact

- `packages/storybook-addon-designbook/src/vite-plugin.ts` — major refactor of `loadScenesYml`
- `packages/storybook-addon-designbook/src/preset.ts` — use shared metadata module
- `packages/storybook-addon-designbook/src/renderer/` — SDC-specific code moves here
- `packages/storybook-addon-designbook/src/withGlobals.ts` — deleted
- No breaking changes to scene file format or Storybook output
