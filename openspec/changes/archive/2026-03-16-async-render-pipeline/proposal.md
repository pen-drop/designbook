## Why

The rendering pipeline uses string markers (`__ENTITY_EXPR__`, `__LIST_EXPR__`) as a sync-to-async bridge because `SceneNodeRenderer.render()` returns `string` but JSONata evaluation is async. This creates a complex post-processing step (`resolveMarkers`) that must be re-implemented by every `ModuleBuilder` adapter and breaks multi-framework support — each framework adapter carries redundant, error-prone marker resolution logic.

## What Changes

- **BREAKING** `SceneNodeRenderer.render()` returns `Promise<string>` instead of `string`
- **BREAKING** `RenderContext.renderNode` becomes `(node: SceneNode) => Promise<string>`
- **BREAKING** `SceneNodeRenderService.render()` becomes async
- `ModuleBuilder.resolveMarkers()` is removed — no longer part of the interface
- `entityJsonataRenderer` and `configRenderer` resolve async inline (no markers emitted)
- `sdcModuleBuilder` loses `resolveMarkers` implementation
- New `reactComponentRenderer` added for React CSF output
- New `vue3ComponentRenderer` added for Vue3 CSF output
- New `reactModuleBuilder` adapter added
- New `vue3ModuleBuilder` adapter added
- `entityJsonataRenderer` and `configRenderer` become shared across all three frameworks
- All renderer tests updated: marker assertions replaced with actual output assertions

## Capabilities

### New Capabilities

- `async-scene-renderer`: Core pipeline change — `render()` goes async, markers eliminated, `ModuleBuilder` interface simplified
- `multi-framework-renderers`: React and Vue3 component renderers + module builders sharing the async entity/config renderer infrastructure

### Modified Capabilities

- `screen-renderer`: Renderer interface contract changes (render signature, renderNode signature)
- `view-mode-jsonata`: Entity renderer now resolves JSONata inline instead of via markers
- `recursive-entity-resolution`: Recursive entity resolution now happens through async `renderNode` chain, not multi-pass marker scanning

## Impact

- `src/renderer/types.ts` — `SceneNodeRenderer`, `RenderContext` interface changes
- `src/renderer/render-service.ts` — async render dispatch
- `src/renderer/scene-module-builder.ts` — await render calls, remove resolveMarkers call
- `src/renderer/entity-renderer.ts` — inline async JSONata evaluation
- `src/renderer/config-renderer.ts` — inline async row rendering
- `src/renderer/builders/sdc/module-builder.ts` — remove resolveMarkers
- `src/renderer/builders/sdc/renderer.ts` — renderNode mock updates in tests
- New: `src/renderer/builders/react/renderer.ts`, `module-builder.ts`, `index.ts`
- New: `src/renderer/builders/vue3/renderer.ts`, `module-builder.ts`, `index.ts`
- All renderer `__tests__/*.test.ts` — mocks and assertions updated
