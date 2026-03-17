## 1. SSE Endpoint (vite-plugin.ts)

- [x] 1.1 Add SSE client registry (Set of response objects) in `configureServer`
- [x] 1.2 Add `/__designbook/events` middleware that sets SSE headers, adds client to registry, removes on close
- [x] 1.3 Add `notifySseClients()` helper that sends `data: {}\n\n` to all registered clients
- [x] 1.4 Call `notifySseClients()` in `watcher.on('add')`, `watcher.on('change')`, `watcher.on('unlink')`
- [x] 1.5 Remove the `watchPatterns` array and `fireEvent()` function (granular WS events)

## 2. Panel.tsx

- [x] 2.1 Replace `setInterval(poll, POLL_INTERVAL)` with `EventSource('/__designbook/events')`
- [x] 2.2 On `eventSource.onmessage` → call `poll()` immediately
- [x] 2.3 Close `EventSource` in cleanup (return of `useEffect`)
- [x] 2.4 Remove `POLL_INTERVAL` constant

## 3. useDesignbookData.js

- [x] 3.1 In `useEffect`, open `new EventSource('/__designbook/events')`
- [x] 3.2 On `eventSource.onmessage` → call `load()`
- [x] 3.3 Close `EventSource` in cleanup
