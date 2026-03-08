## Why

The current entity-to-component mapping uses a custom `$field_name` micro-syntax embedded inside `data-model.yml`. This mixes schema definition with display logic, is limited to simple field lookups (no fallbacks, conditionals, or transformations), cannot be tested in isolation, and requires code changes for every new mapping capability.

JSONata — already used for CSS token generation via `jsonata-w` — provides a standardized, powerful expression language that solves all these problems.

## What Changes

- **BREAKING**: `view_modes` with `mapping[]` removed from `data-model.yml` — it becomes a pure data schema
- View-mode mappings move to separate `.jsonata` expression files in `view-modes/` directory
- The addon evaluates expressions in-memory at Vite load time via the `jsonata` npm library (no file output)
- `$field_name` custom micro-syntax replaced by JSONata path syntax (`field_name`)
- Monolithic `renderNode()` in `vite-plugin.ts` extracted into a pluggable `ScreenNodeRenderer` registry
- Integrations can register custom renderers via addon options in `.storybook/main.js`
- `jsonata` added as a runtime dependency to `storybook-addon-designbook`

## Capabilities

### New Capabilities
- `view-mode-jsonata`: JSONata-based view-mode mapping — separate `.jsonata` expression files, in-memory evaluation, expression caching, and pluggable renderer registry for framework-agnostic rendering

### Modified Capabilities
- `entity-type-renderer`: Mapping resolution changes from `$field_name` syntax to JSONata evaluation. `resolveValue()` and `resolveMapping()` removed entirely.
- `screen-renderer`: Rendering pipeline refactored from hardcoded `renderNode()` to pluggable `ScreenNodeRenderer[]` registry with priority-based dispatching.

## Impact

- **Addon code**: `entity/resolver.ts` (resolveValue/resolveMapping removed), `vite-plugin.ts` (renderNode extracted to registry), `entity/types.ts` (ViewModeDef simplified), `preset.ts` (reads renderer config from options)
- **Schema**: `data-model.schema.yml` — `view_modes`, `view_mode`, `mapping_entry` definitions removed
- **Skills**: `designbook-data-model` (view_modes section removed), `designbook-screen` (prerequisites updated to .jsonata files)
- **Integration config**: `.storybook/main.js` gains optional `renderers` array in addon options
- **Dependencies**: `jsonata` npm package added (~130KB)
- **Test fixtures**: `resolver.test.ts` must be rewritten to use `.jsonata` fixture files
