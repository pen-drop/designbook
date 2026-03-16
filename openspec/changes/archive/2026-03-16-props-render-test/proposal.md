## Why

Props defined on `component:` scene items (e.g. `props: { level: h1 }`) are not being forwarded to the component at render time, so components always receive an empty props object. The existing test coverage only checks that the prop value string appears somewhere in the module output — it does not verify the structural path or runtime delivery.

## What Changes

- Add a failing test that reproduces the props-not-forwarded bug for `ComponentDirect` scenes
- Fix the renderer pipeline so `props` on `component:` scene items are correctly passed to `mod.render(props, slots)` at runtime
- Strengthen the `scene-module-builder` integration test to assert that props are in the correct JSON key (not just a substring match)
- Add a `renderer.test.ts` case that verifies props pass-through from a fully built scene through to the render call

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `scene-rendering`: Props defined on `component:` items in scenes must be forwarded to the component renderer

## Impact

- `src/renderer/renderer.ts` — runtime props extraction
- `src/renderer/builders/component-builder.ts` — build-time props preservation
- `src/renderer/__tests__/scene-module-builder.test.ts` — strengthen assertions
- `src/renderer/__tests__/renderer.test.ts` — add props pass-through test
