## 1. Update types

- [x] 1.1 In `src/renderer/types.ts`: rename `slots` → `with` on `SceneSceneNode` (type `Record<string, unknown>`)
- [x] 1.2 Remove `SceneLayoutEntry`, `SceneComponentEntry`, `SceneEntityEntry`, `SceneConfigEntry` type aliases and union
- [x] 1.3 Remove `isSceneEntityEntry`, `isSceneComponentEntry`, `isSceneConfigEntry` type guards
- [x] 1.4 Change `SceneDef.items` from `SceneLayoutEntry[]` to `SceneNode[]`

## 2. Update scene-builder.ts

- [x] 2.1 Add `substitute(obj, vars)` recursive function
- [x] 2.2 Remove `entryToSceneNode()` and its imports
- [x] 2.3 Replace merge logic with: `if (withVars) scene = substitute(scene, withVars) as SceneDef`
- [x] 2.4 Read `with` from `sceneNode` (and `slots` as deprecated alias with `console.warn`)
- [x] 2.5 Iterate `scene.items` directly via `ctx.buildNode(entry as SceneNode)` — no conversion

## 3. Update scene-module-builder.ts

- [x] 3.1 Remove `entryToSceneNode()` and its imports (`isSceneEntityEntry` etc.)
- [x] 3.2 Update `SceneDef.items` iteration to use `ctx.buildNode(entry as SceneNode)` directly

## 4. Update builders: property-based appliesTo

- [x] 4.1 `entity-builder.ts`: `appliesTo` → `'entity' in node`
- [x] 4.2 `component-builder.ts`: `appliesTo` → `'component' in node`
- [x] 4.3 `config-list-builder.ts`: `appliesTo` → `'config' in node`

## 5. Placeholder rendering

- [x] 5.1 In `src/renderer/renderer.ts`: detect slot values matching `/^\$\w+$/` and return placeholder HTML: `<div style="border:1px dashed #ccc;border-radius:4px;padding:8px 12px;color:#999;font-size:11px;font-family:monospace;">$content</div>`

## 6. Tests

- [x] 6.1 Create `src/renderer/builders/__tests__/scene-builder.test.ts`
- [x] 6.2 Unit tests for `substitute()`: match, no-match, nested object, nested array, multiple vars
- [x] 6.3 Integration test: shell with `$content`, section with `with:`, verify built output has correct component tree
- [x] 6.4 Test: unresolved `$variable` stays as string (not `[]`)
- [x] 6.5 Test: deprecated `slots:` alias produces correct output + warning
- [x] 6.6 Test: existing scenes without `$variables` unchanged (regression)
- [x] 6.7 Create fixture files `src/renderer/builders/__tests__/fixtures/scene-variables/shell.scenes.yml` and `section.scenes.yml`

## 7. Update test integration fixture

- [x] 7.1 Updated `src/renderer/__tests__/fixtures/shell.scenes.yml`: change `content: []` → `content: $content` (gitignored generated file not modified)

## 8. Verify

- [x] 8.1 Run `pnpm --filter storybook-addon-designbook build` — no errors
- [x] 8.2 Run `pnpm --filter storybook-addon-designbook test` — all tests pass (103/103)
- [x] 8.3 Run lint: `cd packages/storybook-addon-designbook && npx eslint --cache --fix . && cd ../.. && npm run lint`
