## 1. Setup & Dependencies

- [x] 1.1 Add `jsonata` npm dependency to `packages/storybook-addon-designbook/package.json`
- [x] 1.2 Create `vitest.config.ts` in addon package (environment: node, include: `src/**/__tests__/**/*.test.ts`)

## 2. Renderer Registry

- [x] 2.1 Create `src/renderer/types.ts` — `ScreenNodeRenderer`, `RenderContext` interfaces
- [x] 2.2 Create `src/renderer/render-service.ts` — `ScreenNodeRenderService` class (register, render, priority sorting, fallback)
- [x] 2.3 Create `src/renderer/__tests__/render-service.test.ts` — unit tests (dispatch, priority, fallback, merge, debug logging)

## 3. Built-in Renderers

- [x] 3.1 Create `src/renderer/sdc-renderer.ts` — SDC component renderer (provider prefix, import tracking, slot nesting, TwigSafeArray)
- [x] 3.2 Create `src/renderer/entity-renderer.ts` — Entity JSONata renderer (expression loading, caching, record lookup, recursive render)
- [x] 3.3 Create `src/renderer/__tests__/sdc-renderer.test.ts` — unit tests
- [x] 3.4 Create `src/renderer/__tests__/entity-renderer.test.ts` — integration tests with `.jsonata` fixture files
- [x] 3.5 Create test fixtures in `src/renderer/__tests__/fixtures/` (view-modes/*.jsonata, data-model.yml, data.yml)

## 4. Expression Cache

- [x] 4.1 Create `src/renderer/expression-cache.ts` — compiled JSONata expression cache (compile once, evaluate many, invalidation)
- [x] 4.2 Create `src/renderer/__tests__/expression-cache.test.ts` — unit tests (caching, reuse, invalidation)

## 5. Vite Plugin Refactor

- [x] 5.1 Update `src/preset.ts` — read `renderers` from `options.designbook`, pass to vite-plugin
- [/] 5.2 Refactor `src/vite-plugin.ts` `loadScreenYml()` — replace inline `renderNode()` with `ScreenNodeRenderService`
- [/] 5.3 Build `RenderContext` in `loadScreenYml()` — wire up dataModel, sampleData, provider, expressionCache, import tracking
- [x] 5.4 Register built-in + integration renderers in correct priority order
- [ ] 5.5 Add HMR support for `view-modes/*.jsonata` files (watch + invalidate expression cache)

## 6. Entity Resolver Simplification

- [ ] 6.1 Remove `resolveValue()` from `src/entity/resolver.ts` — no longer needed
- [ ] 6.2 Remove `resolveMapping()` from `src/entity/resolver.ts` — entity renderer handles this via JSONata
- [ ] 6.3 Simplify `src/entity/types.ts` — remove `ViewModeDef` mapping types (view_modes stays for backward compat but mapping removed)

## 7. Test Migration

- [ ] 7.1 Rewrite `src/screen/__tests__/resolver.test.ts` — use `.jsonata` fixtures instead of inline `$field_name` data-model fixtures
- [x] 7.2 Create JSONata expression tests in `src/renderer/__tests__/expressions.test.ts` — validate expressions produce correct `ComponentNode[]`
- [x] 7.3 Run full test suite: `pnpm test`

## 8. Integration Migration (test-integration-drupal)

- [x] 8.1 Create `designbook/view-modes/` directory in test-integration-drupal
- [x] 8.2 Convert view_modes from `data-model.yml` to `.jsonata` files (`node.article.full.jsonata`, `node.article.teaser.jsonata`, etc.)
- [x] 8.3 Remove `view_modes` from `data-model.yml` (keep schema-only: fields, entity types)
- [ ] 8.4 Verify Storybook build: `npm run build-storybook`

## 9. Schema & Skill Updates

- [x] 9.1 Update `data-model.schema.yml` — remove `view_modes`, `view_mode`, `mapping_entry` definitions
- [x] 9.2 Update `designbook-data-model` SKILL.md — remove view_modes section, update description
- [x] 9.3 Update `designbook-screen` SKILL.md — update prerequisites (view-modes/*.jsonata), error handling
- [x] 9.4 ~~Decide: create new `designbook-view-modes` skill or integrate into `designbook-screen`~~ — created `designbook-view-modes` skill

## 10. Build & Publish

- [ ] 10.1 Build addon: `pnpm build`
- [ ] 10.2 Run full test suite: `pnpm test`
- [ ] 10.3 Storybook build verification: `npm run build-storybook` (test-integration-drupal)
- [ ] 10.4 Publish new addon version to npm
