## 1. Types & Interfaces

- [x] 1.1 Define `SceneNodeBuilder` interface in `types.ts` — `appliesTo()` + async `build()`
- [x] 1.2 Define `BuildContext` interface — `dataModel`, `sampleData`, `designbookDir`, `buildNode()`
- [x] 1.3 Define `ComponentNode` interface — `component`, `props`, `slots`
- [x] 1.4 Define `ComponentModule` interface — `render(props, slots): unknown`
- [x] 1.5 Remove `SceneNodeRenderer`, `RenderContext`, `ModuleBuilder` from `types.ts`

## 2. Builder Registry

- [x] 2.1 Create `builder-registry.ts` — `appliesTo` dispatch, priority sorting
- [x] 2.2 Implement `buildNode(node, ctx)` — finds builder → `build()` → `resolveEntityRefs()`
- [x] 2.3 Implement `resolveEntityRefs(raw, ctx)` — shared walk: top-level SceneNode refs → `buildNode()`, ComponentNode slots → `resolveSlots()`
- [x] 2.4 Fallback: unknown node type emits warning, returns `[]`

## 3. Entity Builder

- [x] 3.1 Create `builders/entity-builder.ts` — `appliesTo: type === 'entity'`
- [x] 3.2 Implement `build()` — locate JSONata file, read with `readFileSync`, `await expr.evaluate(record)`
- [x] 3.3 Iterate JSONata result — `type: 'component'` passes through, `type: 'entity'` calls `ctx.buildNode()` recursively
- [x] 3.4 Handle missing JSONata file and missing sample data — return placeholder ComponentNode

## 4. Config List Builder

- [x] 4.1 Create `builders/config-list-builder.ts` — `appliesTo: type === 'config' && config_type === 'list'`
- [x] 4.2 Implement `build()` — load list config, collect records, `await ctx.buildNode()` per row
- [x] 4.3 Evaluate list JSONata with `$rows`, `$count`, `$limit` — return wrapper ComponentNode[]
- [x] 4.4 Handle missing list config and missing JSONata — return placeholder ComponentNode

## 5. CSF Prep

- [x] 5.1 Create `csf-prep.ts` — `buildCsfModule(opts)` function
- [x] 5.2 Walk `ComponentNode[]` tree recursively — collect all `node.component` references
- [x] 5.3 Resolve component ref → import path (framework-specific resolver injected as option)
- [x] 5.4 Generate import statements + `__imports` map
- [x] 5.5 Generate CSF module string — default export + story exports with `args.__scene` + `render: (args) => renderComponent(args.__scene, __imports)`

## 6. Runtime Renderer

- [x] 6.1 Create `renderer.ts` — `renderComponent(nodes, imports)` — sync, recursive
- [x] 6.2 Handle array and single node inputs
- [x] 6.3 Resolve slots recursively — arrays through `renderComponent`, plain values pass through
- [x] 6.4 Call `mod.render(props, slots)` at leaf — framework-agnostic
- [x] 6.5 Export `renderComponent` as public API from addon index

## 7. Scene Module Builder (orchestration)

- [x] 7.1 Rewrite `scene-module-builder.ts` — wires builder registry + CSF prep
- [x] 7.2 Parse scenes YAML, load data model + sample data (unchanged)
- [x] 7.3 For each scene: `await buildNode()` per layout entry → collect `ComponentNode[]`
- [x] 7.4 Pass resolved scenes to `buildCsfModule()` — return module string

## 5b. Scene Builder

- [x] 5b.1 Create `builders/scene-builder.ts` — `appliesTo: type === 'scene'`
- [x] 5b.2 Implement `build()` — parse `ref` (source:sceneName), load referenced `*.scenes.yml`, locate scene by name
- [x] 5b.3 For each slot in referenced scene: `await ctx.buildNode()` per entry
- [x] 5b.4 For each slot override in `node.slots`: `await ctx.buildNode()` per entry
- [x] 5b.5 Merge: override replaces referenced scene's slot → return merged `ComponentNode[]`
- [x] 5b.6 Remove `layout:` root-level key handling from `scene-module-builder.ts` — parse `scene.items` instead

## 8. Remove Old Pipeline

- [x] 8.1 Delete `entity-renderer.ts`, `config-renderer.ts`, `render-service.ts`
- [x] 8.2 Delete `builders/sdc/module-builder.ts` (old adapter with `resolveMarkers`)
- [x] 8.3 Remove `ModuleBuilder`, `SceneNodeRenderer`, `RenderContext` types

## 9. Test Fixtures

- [x] 9.1 Add `user.user` records to `fixtures/data.yml`
- [x] 9.2 Add `user.user` content type + `recent_articles` list config to `fixtures/data-model.yml`
- [x] 9.3 Create `fixtures/view-modes/node.article.card.jsonata` — card with entity in `author` slot
- [x] 9.4 Create `fixtures/shell.scenes.yml` — page component with nav/content/footer slots using `items`
- [x] 9.5 Create `fixtures/test.scenes.yml` — 6 scenes using `items`: Flat, EntityInEntity, EntityInComponentSlot, ConfigList, ComponentDirect, WithShell

## 10. Tests

- [x] 10.1 `__tests__/entity-builder.test.ts` — build() returns ComponentNode[], recursion on entity refs, missing file/data fallback
- [x] 10.2 `__tests__/config-list-builder.test.ts` — rows collected, list JSONata applied, limit respected
- [x] 10.3 `__tests__/builder-registry.test.ts` — appliesTo dispatch, unknown node fallback
- [x] 10.4 `__tests__/renderer.test.ts` — sync rendering, slot recursion, array + single node
- [x] 10.5 `__tests__/scene-builder.test.ts` — loads shell fixture, merges slots, override replaces default
- [x] 10.6 `__tests__/scene-module-builder.test.ts` integration using `fixtures/test.scenes.yml`:
  - `Flat`: `args.__scene` has figure, heading, text-block nodes
  - `EntityInEntity`: heading + badge nodes — entity ref resolved at top level of JSONata output
  - `EntityInComponentSlot`: card node with badge in `author` slot — entity ref resolved inside component slot
  - `ConfigList`: view/grid node wrapping article nodes
  - `ComponentDirect`: heading node with h1 prop
  - `WithShell`: page node with nav in header, article in content, footer in footer
  - All scenes: output module string has no markers
