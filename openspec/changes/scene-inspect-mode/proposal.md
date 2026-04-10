## Why

The build pipeline (`buildSceneModule`) resolves SceneNodes directly into flat `ComponentNode[]`, discarding all origin information. There is no intermediate representation — entity types, mappings, scene-ref sources, and slot structures are lost. Developers cannot inspect how a scene is composed or how entities map to components.

Analogous to Drupal's `entity->build()` → render array → `entity->view()` → HTML, the pipeline needs a two-phase model: `build()` produces a SceneTree (annotated intermediate representation), and `view()` projects it into a RenderTree (the existing `ComponentNode[]`).

## What Changes

- **BREAKING**: `SceneNodeBuilder.build()` return type changes from `Promise<RawNode[]>` to `Promise<BuildResult>` — builders must return `{ nodes, meta }` with origin metadata
- Introduce `SceneTree` as the canonical intermediate representation between parsing and rendering. Each `SceneTreeNode` carries its origin (entity/scene-ref/component/string), resolved component, props, and recursive slots
- `view()` function projects `SceneTree` → `RenderTree` (`ComponentNode[]`) by stripping metadata — trivial transformation
- `buildSceneModule()` emits `SceneTree` as `parameters.sceneTree` alongside existing `args.__scene` (RenderTree)
- Add Toolbar inspect button (`types.TOOL`) toggling a Canvas overlay that outlines top-level scene nodes with type-colored borders
- Add Structure panel (`types.PANEL`) showing a composition tree (entities/scene-refs only) with click-to-inspect mapping detail
- `MappingDetail` component is standalone — reusable in data-model views for any entity-type + view_mode

## Capabilities

### New Capabilities
- `scene-tree`: SceneTree intermediate representation and build pipeline changes. Builders return `BuildResult` with origin metadata, registry assembles `SceneTreeNode[]`, `view()` projects to `ComponentNode[]`.
- `scene-inspect-overlay`: Toolbar toggle (`types.TOOL`) activates Canvas decorator drawing type-colored outlines around top-level scene nodes. Click selects node via Storybook channel.
- `scene-structure-panel`: Panel addon (`types.PANEL`) with composition tree (default) and mapping detail (on node selection). Tree shows entities and scene-refs at domain level.
- `mapping-detail-component`: Standalone React component rendering entity mapping: data source fields → mapping → resolved component props/slots. Reusable outside scene context.

### Modified Capabilities
_(none)_

## Impact

- **Builder Interface**: `SceneNodeBuilder.build()` return type changes (breaking) — all three built-in builders and any custom builders must adapt
- **Build Pipeline**: `BuilderRegistry` and `buildSceneModule()` gain SceneTree assembly phase between build and CSF emission
- **CSF Output**: Stories gain `parameters.sceneTree` (additive — `args.__scene` unchanged)
- **Addon Manager**: New toolbar button + panel registration in `manager.tsx`
- **Addon Preview**: New decorator for inspect overlay
- **New Components**: `CompositionTree`, `MappingDetail`, `InspectOverlay`, `StructurePanel`
