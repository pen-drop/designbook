## Context

Debo pages render React components inside Storybook's HTML framework via `mountReact()`. Navigation between stories currently uses `window.top.location.href` manipulation (causing full page reloads) and manual story ID construction. The Sections overview imports a static Vite virtual module that cannot refresh at runtime.

Storybook 10 provides a `selectStory` channel event that navigates internally without page reload. The `/__designbook/status` HTTP endpoint already returns section metadata from the filesystem.

## Goals / Non-Goals

**Goals:**
- Single navigation mechanism via Storybook's channel API (no page reload)
- Live-updating sections list without Storybook restart
- Consistent heading in empty and non-empty sections states

**Non-Goals:**
- Changing Storybook's sidebar navigation behavior
- Theme switching for Debo pages (separate concern)
- Modifying the `/__designbook/status` endpoint response format

## Decisions

### 1. Navigation: `selectStory` channel event over URL manipulation

Use `addons.getChannel().emit('selectStory', { storyId })` from `storybook/preview-api`.

**Why over `window.top.location`**: The current approach forces a full page reload. The `selectStory` event is Storybook's internal SPA navigation — the manager receives it, looks up the story in its index, and calls `navigate()` without reloading. This is how Storybook's own sidebar navigates.

**Why `storyId` over `title`+`name`**: While `selectStory` supports both, `storyId` is simpler. The IDs are deterministic (Storybook's `toId(title, name)` is a simple sanitize+kebab). For Scenes, the `group` field from the YAML already defines the title. For Sections overview links, the section ID is known.

### 2. DeboLink as a styled `<a>` with onClick override

Render as `<a href="?path=/story/{storyId}">` with `onClick` calling `e.preventDefault()` + channel emit.

**Why**: Preserves accessibility (real anchor, keyboard-navigable, right-click "open in new tab" works). The `href` is a valid Storybook URL as fallback.

### 3. Sections data: `/__designbook/status` + channel events

Replace `virtual:designbook-sections` with a `useSections()` hook that:
1. Fetches `/__designbook/status` on mount, extracts `sections` array
2. Listens for `designbook:file-add`, `designbook:file-update`, `designbook:file-delete` channel events
3. Re-fetches on events where path starts with `sections/`

**Why over index.json**: The status endpoint returns sections even before they have scene stories. It's already implemented and scans the filesystem directly.

**Why over HMR invalidation of virtual module**: Virtual module invalidation requires Vite plugin changes and still ties the data to Storybook's module system. The HTTP+channel approach is decoupled and consistent with how `useDesignbookData` works.

### 4. File placement

- `DeboLink.jsx` → `src/components/ui/DeboLink.jsx` (alongside other Debo UI components)
- `useSections.js` → `src/hooks/useSections.js` (alongside `useDesignbookData.js`)

## Risks / Trade-offs

- **[selectStory payload shape]** → The event payload `{ storyId }` is undocumented public API but stable since Storybook 7. Verified in Storybook 10.2.17 source. Mitigation: if it changes, the `href` fallback still works.
- **[Status endpoint latency]** → Fetching `/__designbook/status` on mount adds a network round-trip vs the synchronous virtual module. Mitigation: sections list is small, endpoint is local, and the loading state is brief.
- **[virtual:designbook-sections removal]** → Breaking if any external code imports it. Mitigation: it's an internal virtual module (`\0`-prefixed), not a public API. Can be removed.
