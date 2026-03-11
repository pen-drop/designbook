## 1. HMR invalidation for .scenes.yml modules

- [ ] 1.1 Extend `handleHotUpdate()` in `vite-plugin.ts` to detect `.scenes.yml` file changes and invalidate the corresponding module in Vite's module graph
- [ ] 1.2 When the changed file is a `.section.scenes.yml`, also invalidate the `\0virtual:designbook-sections` module

## 2. New file handling

- [ ] 2.1 Update the watcher 'add' handler in `configureServer()` to invalidate `virtual:designbook-sections` when a new `.section.scenes.yml` is added

## 3. Cleanup

- [ ] 3.1 Remove debug `console.log` statements from `vite-plugin.ts` load() (lines 57-61)
- [ ] 3.2 Remove debug `console.log` statements from `preset.ts` indexer (lines 114, 152)
