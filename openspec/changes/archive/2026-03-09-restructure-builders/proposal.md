## Why

The `renderer/` directory has a flat structure mixing framework-agnostic core files with SDC-specific builders. Two additional framework builders (React, Vue) are coming soon, which would create a naming collision mess (`react-module-builder.ts`, `react-renderer.ts`, `vue-module-builder.ts`, `vue-renderer.ts`...) in the same directory as the core.

## What Changes

- Move SDC-specific files (`sdc-module-builder.ts`, `sdc-renderer.ts`) into `renderer/builders/sdc/`
- Create barrel `index.ts` per builder with re-exports and the `sdcRenderers` preset array
- Fix broken import from deleted `presets/sdc.ts`
- Update all import paths (vite-plugin, index, tests)
- Establish the pattern: `builders/{framework}/` for future builders

## Capabilities

### New Capabilities
- `builder-directory-convention`: Defines the `renderer/builders/{framework}/` directory pattern with barrel exports. Each builder folder contains `module-builder.ts`, `renderer.ts`, and `index.ts`.

### Modified Capabilities
- `screen-renderer`: Import paths change for SDC builder. `ModuleBuilder` interface stays in core `scene-module-builder.ts`.

## Impact

- `packages/storybook-addon-designbook/src/renderer/` directory structure
- Import paths in `vite-plugin.ts`, `renderer/index.ts`, and `__tests__/sdc-renderer.test.ts`
- No runtime behavior changes — pure file reorganization
