## 1. Server — vite-plugin.ts

- [ ] 1.1 Add `picomatch` as explicit devDependency in the addon's `package.json`
- [ ] 1.2 Define static `FILE_TYPES` map (type name → glob pattern) in `vite-plugin.ts`
- [ ] 1.3 Write a `resolveFileType(relativePath)` helper that tests each glob and returns the first matching type or `null`
- [ ] 1.4 Replace `notifySseClients()` calls in `watcher.on('add')` with `server.ws.send({ type:'custom', event:'designbook:file-add', data:{ fileType, path } })` — skip if `resolveFileType` returns `null`
- [ ] 1.5 Same replacement for `watcher.on('change')` → `designbook:file-update`
- [ ] 1.6 Same replacement for `watcher.on('unlink')` → `designbook:file-delete`
- [ ] 1.7 Remove `sseClients` Set, `notifySseClients` function, and the `/__designbook/events` middleware handler
- [ ] 1.8 Remove `designbook:workflow-event` and `designbook:workflow-progress` emissions (all special-case branching in the watcher handlers)

## 2. Hook — useDesignbookData.js

- [ ] 2.1 Remove the `EventSource` setup and `es.onmessage` listener from `useEffect`
- [ ] 2.2 Store `parser` in a `useRef` so the channel listener always calls the current version without re-subscribing
- [ ] 2.3 On mount, subscribe to `designbook:file-add` and `designbook:file-update` via `addons.getChannel()` — call `load()` only when `event.path === path`
- [ ] 2.4 On `designbook:file-delete` — set `data` to `null` directly when `event.path === path`, no fetch
- [ ] 2.5 Return channel unsubscribe functions from `useEffect` cleanup

## 3. Panel — Panel.tsx

- [ ] 3.1 Remove the `EventSource` construction and `debounceTimer` logic
- [ ] 3.2 Subscribe to `designbook:file-update` and `designbook:file-add` via `api.on()` — call `poll()` only when `event.fileType === 'task'`
- [ ] 3.3 Unsubscribe in the `useEffect` cleanup (`api.off()`)
- [ ] 3.4 Verify initial mount still calls `poll()` once when `active` becomes true

## 4. manager-notifications.ts

- [ ] 4.1 Replace `api.on('designbook:workflow-event')` with `api.on('designbook:file-add')` — fire "started" toast when `fileType === 'task'` and `path` contains `workflows/changes/`
- [ ] 4.2 Replace done-toast trigger: `api.on('designbook:file-delete')` — fire "done" toast when `fileType === 'task'` and `path` contains `workflows/changes/`
- [ ] 4.3 Remove `WorkflowEvent` interface and all references to the old event types
- [ ] 4.4 Remove `parseTaskFile` helper in `vite-plugin.ts` if it's only used by the deleted workflow-event emissions

## 5. Verification

- [ ] 5.1 Load Storybook with multiple DeboSections — confirm no EventSource connections in DevTools Network tab
- [ ] 5.2 Edit a watched file — confirm only the matching DeboSection re-renders
- [ ] 5.3 Delete a watched file — confirm the matching DeboSection shows empty state immediately
- [ ] 5.4 Edit a task YAML — confirm Panel refreshes; edit a non-task file — confirm Panel does not refresh
- [ ] 5.5 Create a task file in `workflows/changes/` — confirm "started" toast appears
- [ ] 5.6 Delete a task file from `workflows/changes/` — confirm "done" toast appears
- [ ] 5.7 Rapidly edit the same file multiple times — confirm no render storms or duplicate fetches
