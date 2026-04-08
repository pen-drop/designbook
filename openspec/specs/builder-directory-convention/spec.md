# Builder Directory Convention

## Purpose
Defines the directory structure and architecture for the renderer module, including the builder registry pattern and framework-specific builders.

## Requirements

### Requirement: Renderer root contains core orchestration files
The `renderer/` directory SHALL contain framework-agnostic core files at its root: `scene-module-builder.ts` (async build pipeline orchestrator), `builder-registry.ts` (dispatch and recursive resolution), `renderer.ts` (sync browser-side runtime renderer), `csf-prep.ts` (CSF module generation), `types.ts`, `parser.ts`, `expression-cache.ts`, `scene-handlers.ts`, `scene-metadata.ts`, and `validate-scene-nodes.ts`.

#### Scenario: Core files at renderer root
- **WHEN** a developer lists `renderer/`
- **THEN** it contains `scene-module-builder.ts`, `builder-registry.ts`, `renderer.ts`, `csf-prep.ts`, `types.ts`, `parser.ts`, `expression-cache.ts`, `scene-handlers.ts`, `scene-metadata.ts`, and `validate-scene-nodes.ts`

#### Scenario: Core isolation from builders
- **WHEN** a builder is added or removed in `builders/`
- **THEN** no core files at the renderer root SHALL be modified except `renderer/index.ts` re-exports (if the builder is exported publicly)

### Requirement: Builder registry dispatches to pluggable builders
The `BuilderRegistry` SHALL maintain a list of `SceneNodeBuilder` implementations, dispatch each `SceneNode` to the first builder whose `appliesTo()` returns true, and run `resolveEntityRefs()` on the result to recursively resolve nested entity/scene references.

#### Scenario: Builder dispatch
- **WHEN** a `SceneNode` with `type: 'entity'` is passed to `buildNode()`
- **THEN** the registry finds the `entityBuilder` via `appliesTo()` and delegates to its `build()` method

#### Scenario: Custom builders override built-ins
- **WHEN** custom builders are registered via `SceneModuleOptions.builders`
- **THEN** they are registered after built-ins and checked first (last registered wins on `appliesTo` match)

### Requirement: Built-in builders live in `renderer/builders/`
Built-in `SceneNodeBuilder` implementations SHALL reside as individual files in `renderer/builders/`: `component-builder.ts`, `entity-builder.ts`, `scene-builder.ts`, and `image-style-builder.ts`. Each exports a single `SceneNodeBuilder` object.

#### Scenario: Built-in builder files
- **WHEN** a developer lists `renderer/builders/`
- **THEN** it contains `component-builder.ts`, `entity-builder.ts`, `scene-builder.ts`, and `image-style-builder.ts`

#### Scenario: Builder implements SceneNodeBuilder interface
- **WHEN** any built-in builder is inspected
- **THEN** it exports an object with `appliesTo(node: SceneNode): boolean` and `build(node: SceneNode, ctx: BuildContext): Promise<RawNode[]>`

### Requirement: SDC builder directory is a placeholder barrel
The `renderer/builders/sdc/` directory SHALL contain only an `index.ts` barrel file that documents the old `sdcComponentRenderer` is replaced by the `ComponentBuilder` + `wrapImport` pattern. No `module-builder.ts` or `renderer.ts` files exist in this directory.

#### Scenario: SDC directory contents
- **WHEN** a developer lists `renderer/builders/sdc/`
- **THEN** it contains only `index.ts`
- **AND** the file documents that the old pattern is replaced

### Requirement: Renderer index re-exports public API
`renderer/index.ts` SHALL re-export types, the runtime renderer, the builder registry, built-in builders, and CSF prep utilities.

#### Scenario: Public API exports
- **WHEN** consuming code imports from `renderer/index.ts`
- **THEN** `renderComponent`, `BuilderRegistry`, `resolveEntityRefs`, `componentBuilder`, `entityBuilder`, `sceneBuilder`, `buildCsfModule`, and `ExpressionCache` SHALL be available

### Requirement: Vite plugin imports from renderer root
The `vite-plugin.ts` SHALL import `buildSceneModule` from `./renderer/scene-module-builder` and scene handlers from `./renderer/scene-handlers`. It SHALL NOT import from `./renderer/builders/sdc`.

#### Scenario: Vite plugin imports
- **WHEN** `vite-plugin.ts` loads the scene module builder
- **THEN** the import path SHALL be `'./renderer/scene-module-builder'`
- **AND** it SHALL NOT import `buildSdcModule` or any SDC-specific symbol

### Requirement: Build pipeline is async, runtime is sync
The `scene-module-builder.ts` async pipeline (SceneNode[] -> BuilderRegistry -> ComponentNode[] -> CSF string) SHALL run at build time in Node.js. The `renderer.ts` sync pipeline (ComponentNode[] -> framework-native output) SHALL run at browser runtime.

#### Scenario: Async build pipeline
- **WHEN** `buildSceneModule()` is called during Vite transform
- **THEN** it returns a `Promise<string>` containing a CSF module with fully resolved ComponentNode data

#### Scenario: Sync runtime rendering
- **WHEN** `renderComponent()` is called in the browser
- **THEN** it synchronously traverses ComponentNode trees and calls `ComponentModule.render()` at each leaf
