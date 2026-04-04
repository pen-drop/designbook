## 1. SceneTreeNode Type & BuildResult

- [x] 1.1 Add `SceneTreeNode` type to `src/renderer/types.ts` — `kind` discriminant (component/entity/scene-ref/string), `component`, optional `entity`/`ref`/`value`, `props`, `slots: Record<string, SceneTreeNode[]>`
- [x] 1.2 Add `BuildResult` type to `src/renderer/types.ts` — `{ nodes: RawNode[]; meta: { kind, entity?, ref? } }`
- [x] 1.3 Change `SceneNodeBuilder.build()` return type from `Promise<RawNode[]>` to `Promise<BuildResult>`

## 2. Builder Updates

- [x] 2.1 Update `EntityBuilder.build()` — return `{ nodes, meta: { kind: 'entity', entity: { entity_type, bundle, view_mode, record, mapping: jsonataPath } } }`
- [x] 2.2 Update `SceneBuilder.build()` — return `{ nodes, meta: { kind: 'scene-ref', ref: { source, with } } }`
- [x] 2.3 Update `ComponentBuilder.build()` — return `{ nodes, meta: { kind: 'component' } }`

## 3. SceneTree Assembly & view()

- [x] 3.1 Update `BuilderRegistry.buildNode()` to consume `BuildResult` — call `builder.build()`, extract `meta`, pass `nodes` to `resolveEntityRefs()`, assemble `SceneTreeNode` from meta + resolved output
- [x] 3.2 Update `BuilderRegistry.buildNode()` return type to `Promise<SceneTreeNode[]>` (was `Promise<ComponentNode[]>`)
- [x] 3.3 Create `src/renderer/view.ts` — pure function `view(tree: SceneTreeNode[]): ComponentNode[]` that strips metadata, recursively transforms slots
- [x] 3.4 Add unit tests: view() with entity/scene-ref/component nodes, nested slots, string values

## 4. Build Pipeline Integration

- [x] 4.1 Update `buildSceneModule()` in `scene-module-builder.ts` — build loop now produces `SceneTreeNode[]` per scene, calls `view()` for `ComponentNode[]`
- [x] 4.2 Update `buildCsfModule()` in `csf-prep.ts` — accept `SceneTreeNode[]` per scene, emit as `parameters.sceneTree` in story export
- [x] 4.3 Add integration test: scene YAML with entity + scene-ref + component → verify generated CSF contains both `args.__scene` and `parameters.sceneTree` with correct kinds

## 5. Toolbar Inspect Button

- [x] 5.1 Register `types.TOOL` in `manager.tsx` — toggle button with inspect icon, active state, hidden when no `parameters.scene`
- [x] 5.2 On click: emit `designbook/inspect-mode` channel event (boolean toggle)

## 6. Canvas Inspect Overlay

- [x] 6.1 Create `src/decorators/inspect-overlay.ts` — preview decorator listening for `designbook/inspect-mode` channel event
- [x] 6.2 When active: wrap each top-level rendered element with positioned outline div, colored by kind (grey/blue/green from `parameters.sceneTree`)
- [x] 6.3 Add hover label showing node name + kind
- [x] 6.4 On click: emit `designbook/select-node` channel event with `{ index }`
- [x] 6.5 Register decorator in `preview.ts`

## 7. Structure Panel

- [x] 7.1 Register `types.PANEL` titled "Structure" in `manager.tsx`, visible when `parameters.scene` exists
- [x] 7.2 Create `src/components/CompositionTree.tsx` — renders `SceneTreeNode[]` as hierarchical tree, entities/scene-refs prominent, components de-emphasized
- [x] 7.3 Tree node click selects node, highlights active
- [x] 7.4 Create `src/components/StructurePanel.tsx` — switches between CompositionTree (default) and MappingDetail (on selection), with back button
- [x] 7.5 Panel listens for `designbook/select-node` channel events and syncs selection

## 8. MappingDetail Component

- [x] 8.1 Create `src/components/MappingDetail.tsx` — standalone, accepts single `SceneTreeNode`
- [x] 8.2 Entity view: data source fields (left) → connecting lines → resolved props/slots (right), mapping file as header
- [x] 8.3 Scene-ref view: source name, `with` variables, resolved component
- [x] 8.4 Component view: component name + props/slots directly
- [x] 8.5 Handle minimal node (no props, no slots)

## 9. Verification

- [x] 9.1 Run `./scripts/setup-workspace.sh default` from repo root, then `pnpm run dev` — verify toolbar button, overlay outlines, panel tree, and mapping detail work end-to-end
