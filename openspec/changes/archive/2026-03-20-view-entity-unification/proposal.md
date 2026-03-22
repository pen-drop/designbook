## Why

The `config: list.*` system in scenes.yml and `config:` in data-model.yml introduced a separate query-engine concept that is unnecessary for a preview tool. A view entity is simply a JSONata file with no record input that declares its own entity refs inline — `resolveEntityRefs` handles the rest. No aggregation pipeline, no separate builder.

## What Changes

- **BREAKING** Remove `config:` node type from `scenes.yml` — replaced by `entity: view.<name>`
- **BREAKING** Remove `config:` section from `data-model.yml` and its schema definitions
- Remove `config-list-builder.ts` entirely
- Remove `config-list-builder` from the builder registry
- Remove `ListConfig`, `ConfigSceneNode` types from `types.ts`
- Add `view` entity type convention: `view.<name>.<view_mode>.jsonata` receives `{}` as input and declares entity refs inline
- Builder: if no record found in `data.yml` → pass `{}` as input, no special case
- Rename existing `list.<name>.<view_mode>.jsonata` fixture files → `view.<name>.<view_mode>.jsonata`
- Migrate existing `config: list.*` nodes in `*.scenes.yml` fixtures → `entity: view.*`
- Update `designbook-scenes` skill: replace `config-list.md` with `view-entity.md`

## Capabilities

### New Capabilities

- `view-entity`: Convention for view entities — `entity: view.<name>` in scenes.yml, backed by `view.<name>.<view_mode>.jsonata` with no record input, declares entity refs inline

### Modified Capabilities

- `list-config`: Removed entirely — `config: list.*` pattern is replaced by `view-entity`
- `scene-rendering`: `config:` scene node type removed; `entity:` is now the only node type for data-driven content

## Impact

- `packages/storybook-addon-designbook/src/renderer/builders/config-list-builder.ts` — delete
- `packages/storybook-addon-designbook/src/renderer/builders/` — remove from registry
- `packages/storybook-addon-designbook/src/renderer/types.ts` — remove `ListConfig`, config-related types
- `packages/storybook-addon-designbook/src/validators/schemas/data-model.schema.yml` — remove `config` property, `list`, `list_source` definitions
- `packages/storybook-addon-designbook/src/renderer/__tests__/` — update fixtures, rename jsonata files
- `.agents/skills/designbook-scenes/` — replace `config-list.md`, update `create-scene.md`
- `.agents/skills/designbook-data-model/` — remove `config:` section from task and docs
