## ADDED Requirements

### Requirement: Builder directory structure
Each framework builder SHALL reside in `renderer/builders/{framework}/` with at minimum three files:
- `module-builder.ts` — implements the `ModuleBuilder` interface
- `renderer.ts` — implements `SceneNodeRenderer` for the framework's component format
- `index.ts` — barrel export with named exports and a `{framework}Renderers` array

#### Scenario: New builder directory
- **WHEN** a new builder `react` is added
- **THEN** the directory `renderer/builders/react/` SHALL contain `module-builder.ts`, `renderer.ts`, and `index.ts`

#### Scenario: Builder barrel export
- **WHEN** `renderer/builders/sdc/index.ts` is imported
- **THEN** it SHALL export `sdcComponentRenderer`, `buildSdcModule`, and `sdcRenderers`

### Requirement: Core files remain in renderer root
Framework-agnostic files (`scene-module-builder.ts`, `types.ts`, `render-service.ts`, `entity-renderer.ts`, `expression-cache.ts`, `parser.ts`, `scene-handlers.ts`, `scene-metadata.ts`) SHALL remain in the `renderer/` root directory.

#### Scenario: Core isolation
- **WHEN** a builder is added or removed
- **THEN** no core files SHALL be modified except `renderer/index.ts` re-exports

### Requirement: Renderer index re-exports
`renderer/index.ts` SHALL re-export builder symbols from `./builders/{framework}` barrel imports.

#### Scenario: SDC exports available
- **WHEN** consuming code imports from `renderer/index.ts`
- **THEN** `sdcComponentRenderer`, `buildSdcModule`, and `sdcRenderers` SHALL be available

## MODIFIED Requirements

### Requirement: Screen Renderer Import Paths
The `vite-plugin.ts` SHALL import `buildSdcModule` from `./renderer/builders/sdc` instead of `./renderer/sdc-module-builder`.

#### Scenario: Vite plugin SDC import
- **WHEN** `vite-plugin.ts` loads the SDC module builder
- **THEN** the import path SHALL be `'./renderer/builders/sdc'`
