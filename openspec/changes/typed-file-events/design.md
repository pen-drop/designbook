## Context

The addon currently uses a custom SSE endpoint (`/__designbook/events`) to notify React components of file changes. Each `DeboSection` and `Panel` opens its own `EventSource` connection and re-fetches all data on every ping — regardless of which file actually changed. With many sections loaded simultaneously, this causes:

1. N parallel `EventSource` connections (one per component)
2. An infinite render loop when `parser` is an inline function (new reference each render → new `useCallback` → new `useEffect` → re-fetch → re-render → ∞)
3. Full re-fetch storms on every file change, even unrelated ones

The addon already uses `server.ws.send({ type: 'custom', event: 'designbook:...' })` for workflow events, and the Manager listens via `api.on()`. This is the Storybook channel — the right primitive for this pattern.

## Goals / Non-Goals

**Goals:**
- Replace SSE with typed channel events carrying `{ fileType, path }`
- One shared transport (Storybook WS channel) — no per-component connections
- Components react only to events relevant to them
- Eliminate the infinite loop root cause (no more `useEffect([load])` where `load` depends on `parser`)

**Non-Goals:**
- Making file types configurable (static in code for now)
- Replacing `/__designbook/load` or `/__designbook/workflows` HTTP endpoints
- Supporting file types for component files (`components/` dir) — out of scope

## Decisions

### 1. Storybook WS channel over custom SSE

The addon already uses `server.ws.send()` for workflow events. Reusing the same channel avoids a second persistent connection and keeps all event routing in one place.

Manager context uses `api.on('designbook:file-update', ...)`.
Preview context (DeboSection) uses `addons.getChannel().on('designbook:file-update', ...)` from `storybook/preview-api`.

Alternative considered: keep SSE but add payload. Rejected — still N connections, still every component subscribes individually.

### 2. Static glob map in vite-plugin.ts

```typescript
const FILE_TYPES: Record<string, string> = {
  task:   'designbook/workflows/**/*.yml',
  scene:  'designbook/**/*.scenes.yml',
  // extend as needed
}
```

First match wins. No match → no event sent.

Alternative: configurable via addon options. Rejected — user has no need for runtime configuration, static is simpler.

### 3. Glob matching via `picomatch`

Vite depends on `picomatch` transitively. Use `picomatch(pattern)(relativePath)` for matching. If unavailable, fall back to a simple `minimatch`-style manual check.

### 4. Panel keeps `/__designbook/workflows` for initial load

On mount, Panel fetches all task files via the existing endpoint. Channel events (`fileType === 'task'`) then trigger incremental re-fetches of the changed file via `/__designbook/load`. This avoids a full reload on every task update.

### 5. `useDesignbookData` hook redesign

Remove `EventSource` entirely. Initial load on mount. Subscribe to channel:

```
file-add    + path match → load()
file-update + path match → load()
file-delete + path match → setData(null), no fetch
```

`parser` reference instability is no longer a problem because it's not a `useCallback` dependency — the channel listener uses a `ref` to always call the current parser without re-subscribing.

## Risks / Trade-offs

- **`addons.getChannel()` in preview** → DeboSection runs inside the Storybook preview iframe. `addons.getChannel()` from `storybook/preview-api` should work there, but this needs verification during implementation.
  Mitigation: test with a simple `channel.on()` call in a story before wiring up the hook.

- **Event ordering** → If two rapid edits arrive, the second event may trigger a load that returns stale content (file not yet written).
  Mitigation: acceptable — next change will trigger another event. Same behavior as today.

- **`picomatch` availability** → It's a Vite transitive dep, not a direct dep of the addon.
  Mitigation: add as explicit `devDependency` of the addon package to guarantee availability.

## Migration Plan

1. Update `vite-plugin.ts`: remove SSE, add typed `server.ws.send()` in watchers
2. Update `useDesignbookData.js`: remove EventSource, add channel subscription
3. Update `Panel.tsx`: remove EventSource + debounce, add channel subscription
4. Delete `/__designbook/events` middleware handler
5. Run Storybook and verify DeboSection + Panel react correctly to file saves
