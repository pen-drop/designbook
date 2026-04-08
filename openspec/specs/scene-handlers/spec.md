# scene-handlers Specification

## Purpose
Scene handler registry, unified Vite loader, merged Storybook indexer, runtime props, HMR invalidation, and shared scene-metadata module.

---

## Requirement: Scene handler registry

File: `src/renderer/scene-handlers.ts`

```typescript
export interface SceneHandler {
  pattern: string;          // file suffix to match (e.g. 'section.scenes.yml')
  hasOverview: boolean;     // whether to generate an Overview story
}
export interface HandlerMatch { handler: SceneHandler; }
export const defaultHandlers: SceneHandler[] = [
  { pattern: 'section.scenes.yml', hasOverview: true },
  { pattern: 'design-system.scenes.yml', hasOverview: false },
];
```

Match logic: `id.endsWith(handler.pattern)` — first match wins, else `null`.

---

## Requirement: Unified loader in vite-plugin.ts

Single `load(id)` routes all matched `*.scenes.yml` through the handler registry:

```
load(id) ->
  1. matchHandler(id, defaultHandlers) — if no match, return undefined
  2. Parse YAML, extract scenes
  3. if handler.hasOverview -> prepend Overview story (React page via mountReact + DeboSectionPage)
  4. Build scene stories via buildSceneModule
  5. Return combined CSF module (esbuild-transformed)
```

- Section files -> Overview export + scene exports
- Design system files -> scene exports only, no Overview
- Empty/missing scenes array -> placeholder module with Overview only

---

## Requirement: Merged Storybook indexer

Single regex `/\.scenes\.yml$/` in `preset.ts`:

- `hasOverview: true` -> Overview entry (type: story, exportName: overview) + scene entries under `/Scenes` title suffix
- `hasOverview: false` -> scene entries only

---

## Requirement: scene-metadata.ts shared module

File: `src/renderer/scene-metadata.ts` — used by both `preset.ts` and `vite-plugin.ts`:

- `extractGroup(parsed, basename)` — returns `parsed.group` || `parsed.name` || basename
- `buildExportName(name)` — PascalCase from any separator (`"pet-discovery-listing"` -> `"PetDiscoveryListing"`)
- `extractScenes(parsed)` — returns `parsed.scenes[]` or `[parsed]` for legacy flat format

---

## Requirement: Props on component items forwarded to renderer

`props:` map on `component:` items passed as first argument to `mod.render(props, slots)`.

- `buildSceneModule` produces CSF where `args.__scene[0].props` equals the declared props object — NOT merged into slots
- Props and slots coexist as separate arguments: `mod.render({ level: 'h1' }, { text: 'Hello World' })`
- No `props:` key -> `mod.render({}, slots)`

---

## Requirement: Scene module invalidation on file change

Vite plugin uses `configureServer` for file watchers sending custom WebSocket events:

- `.scenes.yml` modified/added/deleted -> `designbook:file-update`, `designbook:file-add`, `designbook:file-delete`
- `design-tokens.yml` changes -> `virtual:designbook-themes` invalidated + full reload
- Files classified by matching against known patterns (`**/*.scenes.yml` -> scene, `workflows/**/*.yml` -> task, `data-model.yml` -> dataModel); only recognized types emit events

---

## Requirement: Clean debug output

No `console.log` during normal operation. Only `console.warn`, `console.error`, and `console.debug` are acceptable. Diagnostic messages use `console.debug`.
