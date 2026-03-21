## Context

The Vite plugin already watches `designbook/` for file changes and fires granular WebSocket events (`designbook:data-model-change`, etc.) — but these only reach the Vite preview frame. The Panel and `useDesignbookData` live in two different frames (manager and preview respectively) and both currently rely on polling or no auto-refresh at all. SSE is HTTP-native and works from any frame without requiring a channel bridge.

## Goals / Non-Goals

**Goals:**
- Panel reacts immediately when any Designbook file changes (no more 3s lag)
- `useDesignbookData` reloads immediately when its backing file changes
- Single event model — no per-file-type differentiation needed by consumers

**Non-Goals:**
- Granular diffing of what changed (consumers just reload their existing HTTP fetch)
- Replacing `designbook:workflow-event` / `designbook:workflow-progress` WS events (those drive Storybook notifications, different purpose)
- SSE auth or filtering — all consumers reload on any event

## Decisions

**SSE over Vite WS → Channel bridge**
Vite WS events only reach the preview frame. Forwarding them to the manager via `addons.getChannel()` requires glue code in both frames. SSE is plain HTTP — Panel and `useDesignbookData` can both subscribe directly with `EventSource` without any Storybook-specific wiring.

**Single event, no payload needed**
Consumers don't filter by file type — any change triggers a full reload of their own data. Sending `data: {}\n\n` (empty ping) is sufficient. No JSON parsing overhead.

**Keep `designbook:*-change` WS events temporarily, remove in same PR**
They're currently unused by any consumer. Removing them simplifies the plugin with no breakage.

**SSE endpoint: `/__designbook/events`**
Follows the existing `/__designbook/workflows` and `/__designbook/status` convention. The Vite `configureServer` middleware already handles these — add the SSE endpoint alongside them.

**Reconnect handled by browser**
`EventSource` reconnects automatically on connection drop (e.g., Storybook restart). No custom reconnect logic needed.

## Risks / Trade-offs

- **Thundering herd on large file operations** (e.g., a workflow that writes 10 files in quick succession) → Each file write fires a separate SSE ping. Consumers will reload multiple times in ~100ms. Acceptable — reloads are fast HTTP fetches. Could debounce later if needed.
- **SSE connection limit** (browsers cap per-domain connections) → Only 2 consumers (Panel + useDesignbookData instances), well within the 6-connection limit.

## Migration Plan

1. Add SSE middleware to `vite-plugin.ts`
2. Update `Panel.tsx` — remove `setInterval`, add `EventSource`
3. Update `useDesignbookData.js` — add `EventSource` subscription
4. Remove granular `watchPatterns` WS sends from `vite-plugin.ts`
5. No config changes, no migration needed — pure internal refactor
