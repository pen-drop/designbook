## Context

The `renderer/` directory in `storybook-addon-designbook` has 11 files in a flat structure. SDC-specific files (`sdc-module-builder.ts`, `sdc-renderer.ts`) sit alongside framework-agnostic core files (`scene-module-builder.ts`, `types.ts`, `render-service.ts`). With 2 additional builders planned, the flat structure won't scale.

Additionally, the deleted `presets/sdc.ts` is still referenced from `index.ts` and `sdc-module-builder.ts`, causing build breaks.

## Goals / Non-Goals

**Goals:**
- Group framework-specific builder files into `builders/{framework}/` subdirectories
- Fix broken `presets/sdc` imports
- Establish a repeatable pattern for new builders
- Keep all existing tests passing

**Non-Goals:**
- Changing the `ModuleBuilder` interface
- Changing any runtime behavior
- Creating the React or Vue builders (that's future work)

## Decisions

### 1. `builders/` subdirectory with barrel exports
Each builder gets `builders/{name}/index.ts` that re-exports its public API plus the renderers preset array. This replaces the deleted `presets/` pattern.

**Alternative**: A registry pattern with auto-discovery → rejected as over-engineering for 2-3 builders.

### 2. Keep `ModuleBuilder` interface in core `scene-module-builder.ts`
The interface is framework-agnostic and used by the core build pipeline. Moving it into a builder would create a circular dependency.

### 3. Simplified filenames inside builder dirs
`sdc-module-builder.ts` → `builders/sdc/module-builder.ts`. The `sdc-` prefix is redundant inside the `sdc/` directory.

## Risks / Trade-offs

- **Import path churn** → One-time cost, limited to ~5 files. No external consumers affected (all internal imports).
- **`dist/` copy may miss new paths** → Verify `tsup` `onSuccess` copies correctly after restructure.
