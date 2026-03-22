## Why

The Designbook panel polls `/__designbook/workflows` every 3 seconds, and `useDesignbookData` has no auto-refresh at all — both consumers miss file changes until the next poll cycle or a Storybook restart. Five granular Vite WebSocket events (`designbook:data-model-change`, etc.) exist but nobody listens to them because the manager frame can't receive Vite WS events directly.

## What Changes

- Add a single SSE endpoint `/__designbook/events` to the Vite plugin that fires whenever any file in `designbook/` changes
- Replace the 3-second poll interval in `Panel.tsx` with an `EventSource` subscription that triggers an immediate refetch on any event
- Add an `EventSource` subscription in `useDesignbookData` that calls `reload()` on any event
- Remove the 5 granular Vite WS events (`designbook:*-change`) — superseded by SSE
- Keep `designbook:workflow-event` and `designbook:workflow-progress` WS events for Storybook notifications (they serve a different purpose)

## Capabilities

### New Capabilities
- `sse-file-events`: SSE endpoint `/__designbook/events` that streams a `data: {}\n\n` ping whenever any watched file changes. Consumers subscribe via `EventSource` and reload on any message.

### Modified Capabilities
- `workflow-panel`: Panel no longer polls on an interval — instead reacts to SSE events with an immediate HTTP refetch.

## Impact

- `src/vite-plugin.ts` — add SSE middleware, remove granular `designbook:*-change` WS sends
- `src/components/Panel.tsx` — replace `setInterval` poll with `EventSource` + refetch
- `src/hooks/useDesignbookData.js` — add `EventSource` subscription that calls `reload()`
