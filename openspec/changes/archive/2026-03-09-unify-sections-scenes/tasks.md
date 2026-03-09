## 1. Create scene handler registry

- [ ] 1.1 Create `src/renderer/scene-handlers.ts` with `SceneHandler` interface
- [ ] 1.2 Implement `matchHandler()` with `hasOverview` logic
- [ ] 1.3 Unit tests for handler matching

## 2. Unified loader in vite-plugin.ts

- [ ] 2.1 Replace if/else with handler registry lookup
- [ ] 2.2 Generate docs.page CSF (using `DeboSectionDetailPage`) for overview files
- [ ] 2.3 Remove `loadSectionYml()` — logic merged into unified loader
- [ ] 2.4 Merge `sectionIndexer` into `scenesIndexer` in `preset.ts`

## 3. File migration (test-integration-drupal)

- [ ] 3.1 Merge `spec.section.yml` metadata into new `ratgeber.section.scenes.yml`
- [ ] 3.2 Rename `shell.scenes.yml` → `spec.shell.scenes.yml`, add shell metadata
- [ ] 3.3 Delete old `spec.section.yml` files

## 4. Cleanup

- [ ] 4.1 Delete `src/onboarding/04-shell.mdx`

## 5. Update skills & workflows

- [ ] 5.1 `debo-product-sections.md` — `spec.section.yml` → `*.section.scenes.yml`
- [ ] 5.2 `debo-shape-section.md` — output to `*.section.scenes.yml`
- [ ] 5.3 `debo-sample-data.md` — read from `*.section.scenes.yml`
- [ ] 5.4 `debo-design-screen.md` — scenes → `*.section.scenes.yml`
- [ ] 5.5 `debo-design-shell.md` — `spec.shell.scenes.yml`
- [ ] 5.6 `debo-export-product.md` — updated filenames
- [ ] 5.7 `debo-screenshot-design.md` — updated filenames
- [ ] 5.8 `designbook-scenes/SKILL.md` — format with integrated metadata
- [ ] 5.9 `designbook-sample-data/SKILL.md` — updated filenames
- [ ] 5.10 `designbook-components-sdc/resources/shell-generation.md` — updated

## 6. Verification

- [ ] 6.1 `npm run build` — no errors
- [ ] 6.2 Unit tests pass
- [ ] 6.3 Storybook — sections show Docs + scenes
- [ ] 6.4 Storybook — shell shows Docs + scenes
