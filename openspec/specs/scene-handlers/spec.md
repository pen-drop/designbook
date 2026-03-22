# scene-handlers Specification

## Purpose
Defines the declarative scene handler registry, the unified Vite loader, and the merged Storybook indexer for `*.scenes.yml` files.

---

## Requirement: Scene handler registry

File: `src/renderer/scene-handlers.ts`

```typescript
export interface SceneHandler {
  pattern: string;           // e.g. '.scenes.yml'
  type: 'canvas';
  docsWhenPrefix?: string;   // if filename starts with this, also generate a docs page
  docsComponent?: string;
}

export const defaultHandlers: SceneHandler[] = [
  {
    pattern: '.scenes.yml',
    type: 'canvas',
    docsWhenPrefix: 'spec.',
    docsComponent: 'DeboSection',
  },
];
```

Match logic: `filename.endsWith(handler.pattern)`. `hasDocs = true` if `basename(filename).startsWith(handler.docsWhenPrefix)`. Returns first match or null.

---

## Requirement: Unified loader in vite-plugin.ts

Single `load(id)` handler routes all `*.scenes.yml` files through the handler registry:

```
load(id) →
  1. matchHandler(basename(id), handlers)
  2. if no match → return undefined
  3. Parse YAML
  4. if spec.* prefix → prepend Overview story (plain HTML, no React)
  5. Build scene stories via ModuleBuilder
  6. Return combined CSF module
```

Overview story (for `spec.*` files): reads section metadata from YAML, generates plain HTML story with `parameters: { layout: 'fullscreen' }`.

---

## Requirement: Merged Storybook indexer

The indexer in `preset.ts` scans `*.scenes.yml` only (covers all types):
- `spec.*` prefix → emit Overview entry + scene entries
- No prefix → scene entries only

---

## Requirement: scene-metadata.ts shared module

File: `src/renderer/scene-metadata.ts`

Both `preset.ts` and `vite-plugin.ts` SHALL use this module for:
- `extractGroup(parsed, basename)` — returns `parsed.name` or falls back to basename
- `buildExportName(name)` — PascalCase from any separator (`"Ratgeber Detail"` → `"RatgeberDetail"`, `"pet-discovery"` → `"PetDiscovery"`)
- `extractScenes(parsed)` — returns `parsed.scenes[]` or `[parsed]` for legacy flat format
