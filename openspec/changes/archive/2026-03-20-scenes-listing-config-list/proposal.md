## Why

The `designbook-scenes` skill conflates two patterns — single-entity detail views and multi-entity listing pages — by letting both use `entity + records`. Listing pages should always use `config: list.*` (the Drupal Views analogue), which enforces a clean separation: `entity` selects one record, `config: list` selects a collection. The current `scene-reference.md` is also too monolithic to load efficiently per-task.

## What Changes

- Split `scene-reference.md` into focused resource files: `field-reference.md`, `entry-types.md`, `config-list.md`
- Add rule `rules/listing-pattern.md`: listing scenes must use `config: list.*`, never `entity + records: []`
- Update `tasks/create-scene.md`: Listing scene template uses `config: list.*`; examples moved into the task file
- `entry-types.md` documents all entry types with the clear distinction: `entity` = single item, `config: list` = collection
- `config-list.md` documents the full config:list contract: data-model mapping, sources, JSONata bindings

## Capabilities

### New Capabilities

- `scenes-listing-convention`: Rule and documentation establishing that listing scenes in `*.scenes.yml` files must use `config: list.*` nodes, not `entity + records` arrays

### Modified Capabilities

- (none — runtime behavior unchanged, skill authoring conventions only)

## Impact

- `.agents/skills/designbook-scenes/` — resource files, rules directory, task files
- No runtime code changes (config-list-builder.ts already supports the pattern)
- Skill users (AI agents) will generate correct listing scenes by default
