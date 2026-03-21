## Why

File-watching in the addon currently broadcasts a blank SSE ping to every connected component on any file change, causing all `DeboSection` instances to re-fetch simultaneously. With many sections loaded, this triggers render loops (due to unstable `parser` references) and saturates the browser. The system needs typed, path-aware events so components react selectively.

## What Changes

- Replace the SSE endpoint (`/__designbook/events`) and `sseClients` broadcast with typed Storybook channel events via `server.ws.send()`
- Server maps changed file paths to a file type using static glob patterns (e.g. `task`, `scene`, `vision`)
- Events carry `{ fileType, path }` — no match means no event is sent
- `useDesignbookData` drops its own `EventSource` and subscribes to the shared channel instead, filtering by exact path
- Panel subscribes to channel events filtering by `fileType === 'task'` (replaces its own EventSource + debounce)
- `/__designbook/workflows` endpoint is kept for initial Panel mount; incremental updates come from channel events + `/__designbook/load`
- **BREAKING**: `useDesignbookData` no longer opens an `EventSource` connection per instance

## Capabilities

### New Capabilities
- `file-event-channel`: Typed file-change events (`file-add`, `file-update`, `file-delete`) broadcast over Storybook's WS channel with `fileType` and `path` payload; server-side glob matching determines type

### Modified Capabilities
- `workflow-panel`: Panel now subscribes to channel events instead of owning an EventSource; initial load still uses `/__designbook/workflows`

## Impact

- `src/vite-plugin.ts` — remove SSE infrastructure, add typed `server.ws.send()` calls with glob matching
- `src/hooks/useDesignbookData.js` — remove EventSource, add channel subscription filtered by path
- `src/components/Panel.tsx` — remove EventSource + debounce, add channel subscription filtered by fileType
- No new dependencies (glob matching via `picomatch`, already a Vite transitive dep)
