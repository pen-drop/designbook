## Context

The Vite plugin (`vite-plugin.ts`) serves `.scenes.yml` files as virtual CSF modules via its `load()` hook and provides a `virtual:designbook-sections` module for the sections overview. The `handleHotUpdate()` hook currently only handles data file dependencies (tracked via `dataFileToScenes` map), but does not handle changes to `.scenes.yml` files themselves or the virtual sections module.

Storybook's indexer re-runs on file changes and updates the sidebar, but Vite's module graph retains stale cached modules — causing a disconnect between "story visible in sidebar" and "module loadable".

## Goals / Non-Goals

**Goals:**
- Clicking a story after file change works without browser refresh
- Adding/removing `.section.scenes.yml` updates the sections overview without restart
- Clean up debug console.logs

**Non-Goals:**
- Changing the indexer mechanism itself
- Adding WebSocket-based live reload
- Handling non-YAML file types

## Decisions

### 1. Extend `handleHotUpdate()` for `.scenes.yml` files

When a `.scenes.yml` file changes, look it up in Vite's module graph and return it for invalidation. This causes Vite to re-call `load()` on next import, producing fresh CSF code.

**Alternative considered**: Using `server.ws.send({ type: 'full-reload' })` — too aggressive, reloads everything including unrelated stories.

### 2. Invalidate `virtual:designbook-sections` on section file changes

When any `.section.scenes.yml` file is added or changed, invalidate the `\0virtual:designbook-sections` module in the module graph. This forces `buildSectionsModule()` to re-run, picking up new/removed sections.

Implementation: Store `server` reference in plugin closure, use `server.moduleGraph.getModuleById()` to find and invalidate the virtual module.

### 3. Handle 'add' events for new `.scenes.yml` files

The current watcher 'add' handler emits a synthetic 'change' event. This is correct for triggering Storybook's re-indexing, but needs to also trigger the virtual sections module invalidation for `.section.scenes.yml` files.

## Risks / Trade-offs

- [Module graph invalidation timing] → Vite's invalidation is synchronous and happens before the next import, so the timing should be safe.
- [Rapid successive changes] → Multiple fast edits could cause multiple invalidations, but Vite debounces HMR updates naturally.
