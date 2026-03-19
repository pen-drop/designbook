## Why

The `bundle-composition` spec already defines `unstructured` bundles, but currently assumes a JSONata file must exist for the full view mode. For Storybook preview, this is unnecessary indirection — the component tree is statically authored, not derived from entity fields. Scenes.yml should allow inlining the component tree directly on the entity node, skipping the JSONata lookup entirely.

## What Changes

- `EntitySceneNode` type gets an optional `components?: RawNode[]` field
- `entityBuilder` checks for inline `components` before attempting to load a JSONata file — if present, returns directly (early return, minimal change)
- `resolveEntityRefs` runs unchanged — nested `entity` refs inside `components` slots are still resolved recursively
- `bundle-composition` spec updated: unstructured full view mode MAY use inline `components:` in scenes.yml instead of a JSONata file
- `designbook-scenes` skill: two new rule files (`structured-content.md`, `unstructured-content.md`) so agents know which pattern to use based on `composition` in data-model.yml

## Capabilities

### New Capabilities

- `scene-unstructured-inline`: Entity nodes in scenes.yml support an inline `components: RawNode[]` key. When present, the entityBuilder returns it directly without loading a JSONata file. Nested entity refs in slots are still resolved.

### Modified Capabilities

- `bundle-composition`: Unstructured full view mode no longer requires a JSONata expression file. Inline `components:` in scenes.yml is the preferred authoring path for Storybook preview.

## Impact

- `packages/storybook-addon-designbook/src/renderer/builders/entity-builder.ts` — one early-return guard
- `packages/storybook-addon-designbook/src/renderer/types.ts` — `EntitySceneNode` type extension
- `.agents/skills/designbook-scenes/` — new `rules/` directory with two rule files, updated `SKILL.md` and `create-scene.md` task
- `openspec/specs/bundle-composition/spec.md` — delta spec (modified capability)
