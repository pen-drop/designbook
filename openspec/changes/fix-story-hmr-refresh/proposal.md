## Why

Storybook's HMR for `.scenes.yml` files is broken in two ways: (1) after a file change, stories appear in the sidebar but clicking them throws an error until the browser is refreshed, and (2) when the first `.section.scenes.yml` is added, the sections overview doesn't update because the virtual module is never invalidated.

## What Changes

- Extend `handleHotUpdate()` in the Vite plugin to invalidate `.scenes.yml` modules in Vite's module graph when they change, so `load()` re-runs on next import.
- Invalidate `virtual:designbook-sections` when `.section.scenes.yml` files are added or changed, so the sections overview reflects the current state.
- Remove leftover `console.log` debug statements from `vite-plugin.ts` and `preset.ts`.

## Capabilities

### New Capabilities
- `scene-hmr`: Hot module replacement for `.scenes.yml` files — invalidates Vite module graph entries and the virtual sections module on file changes.

### Modified Capabilities

## Impact

- `packages/storybook-addon-designbook/src/vite-plugin.ts` — `handleHotUpdate()` and `configureServer()` changes
- `packages/storybook-addon-designbook/src/preset.ts` — remove debug console.logs
