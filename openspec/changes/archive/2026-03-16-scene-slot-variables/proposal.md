## Why

Scene composition via `type: scene` uses a fragile implicit slot-override mechanism that blindly patches all top-level built items. This is replaced with explicit `$variable` injection points in templates, making it clear which slots sections can fill, and providing a visible placeholder for unfilled variables.

## What Changes

- Shell scenes declare injectable slots as `$identifier` string values (e.g., `content: $content`)
- Section scenes use `with:` (replacing `slots:`) to fill those variables
- The `sceneBuilder` substitutes variables via a recursive object walk on the raw `SceneDef` before building — no changes to `ComponentNode`
- Unresolved `$variable` strings pass through to the renderer and display as a grey placeholder box
- **BREAKING**: `slots:` on `type: scene` entries replaced by `with:` (deprecated alias kept)
- `SceneLayoutEntry` and `entryToSceneNode()` removed — items typed as `SceneNode[]` directly
- Builders detect entry type by property presence (`'entity' in node`, `'component' in node`, etc.) instead of `type` field

## Capabilities

### New Capabilities

- `scene-slot-variables`: `$variable` placeholder syntax for scene templates, `with:` key for filling them, recursive substitution walk, and visual placeholder rendering for unresolved variables

### Modified Capabilities

- `scene-slot-variables`: scene-builder merge logic replaced with substitution walk; `SceneLayoutEntry` removed; builder `appliesTo` detection updated

## Impact

- `src/renderer/types.ts` — remove `SceneLayoutEntry` variants + guards; rename `slots` → `with` on `SceneSceneNode`
- `src/renderer/builders/scene-builder.ts` — core change: add `substitute()`, remove old merge + `entryToSceneNode`
- `src/renderer/scene-module-builder.ts` — remove `entryToSceneNode`, update items handling
- `src/renderer/builders/entity-builder.ts`, `component-builder.ts`, `config-list-builder.ts` — `appliesTo` property detection
- `src/renderer/csf-prep.ts` — render `$identifier` slot strings as placeholder HTML
- `src/renderer/builders/__tests__/scene-builder.test.ts` — new test file
