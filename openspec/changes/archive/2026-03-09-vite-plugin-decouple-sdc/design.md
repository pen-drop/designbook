## Context

`vite-plugin.ts` contains `loadScenesYml()` — a 250-line function that transforms `*.scenes.yml` files into CSF story modules. It was built when SDC/Twig was the only rendering target. Now the render service (`SceneNodeRenderService`) exists with a pluggable renderer registry, but `loadScenesYml` still hardcodes SDC concerns:

- **Import tracking** (lines 262-278): resolves `../components/{name}/{name}.component.yml` and generates `import * as X` statements
- **Entity marker resolution** (lines 332-366): the `__ENTITY_EXPR__` async pipeline that evaluates JSONata and renders child nodes
- **Code generation** (lines 396-418): generates JS module with `Drupal.attachBehaviors()` and `TwigSafeArray`
- **Scene metadata** (lines 247-249, 376-379): group name derivation and export name generation — duplicated in `preset.ts` (lines 119-133)

### Current flow

```
loadScenesYml()
  → parseScene()           ← shared (parser.ts)
  → load data model/data   ← shared concern
  → setup renderService    ← good (pluggable)
  → trackImport()          ← SDC-specific (hardcoded paths)
  → render + resolve markers ← SDC-specific (marker async pipeline)
  → generate JS module     ← SDC-specific (Drupal.attachBehaviors)
```

## Goals / Non-Goals

**Goals:**
- Extract shared scene metadata into a module used by both `preset.ts` and `vite-plugin.ts`
- Move SDC import tracking, marker resolution, and code generation into the renderer layer
- Make `loadScenesYml` adapter-agnostic — only orchestrates data loading and delegates to render service
- Delete unused `withGlobals.ts`

**Non-Goals:**
- Implementing React/Vue adapters (future work)
- Changing the `*.scenes.yml` format
- Modifying the `SceneNodeRenderService` API
- Adding new features

## Decisions

### 1. Extract `scene-metadata.ts`

**Decision**: Create `src/renderer/scene-metadata.ts` with shared functions:
- `extractGroup(raw, fileBase)` → group name string
- `buildExportName(sceneName)` → valid JS export name
- `extractScenes(raw)` → normalized scene array

**Why**: Eliminates copy-paste duplication between `preset.ts` and `vite-plugin.ts`. Both import from the same module.

**Alternative**: Inline helpers in each file — rejected because it caused the duplication problem.

### 2. Extend RenderContext with code generation hooks

**Decision**: Add an optional `generateModule` method to the render pipeline that wraps rendered HTML into a complete JS module. The SDC preset provides `Drupal.attachBehaviors()`, `TwigSafeArray`, and `import` statement aggregation. The default produces plain HTML.

**Why**: The current `RenderContext.trackImport` already delegates import tracking, but the final module assembly (`TwigSafeArray`, `Drupal.attachBehaviors`, CSF structure) is still hardcoded in `loadScenesYml`. Moving this into the adapter layer makes `loadScenesYml` truly framework-agnostic.

**Alternative**: Have each adapter subclass the entire loader — rejected because 90% of `loadScenesYml` (YAML parse, data load, scene iteration) is shared.

### 3. Move marker resolution into render service

**Decision**: The `__ENTITY_EXPR__` marker pattern and its async resolution (lines 332-366 in `vite-plugin.ts`) move into the entity renderer or a post-processing step in the render service.

**Why**: The marker pattern was an implementation detail of the sync→async bridge in `loadScenesYml`. The render service is the correct owner of this complexity.

## Risks / Trade-offs

- **[Testing gap]** → The existing unit tests in `renderer/__tests__/` cover individual renderers. Integration tests for the full `loadScenesYml` flow don't exist as unit tests — only through the promptfoo workflow tests. Mitigation: Run `npm run build` + Storybook build to verify no regression.
- **[Refactor size]** → Touching both `vite-plugin.ts` and `preset.ts` in one change. Mitigation: Do in two commits — (1) extract metadata, (2) move SDC concerns.
