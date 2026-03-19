## Why

The designbook-scenes skill currently has one task for creating JSONata view mode files (`create-view-modes.md`) that treats all entity mappings uniformly. This doesn't reflect the two fundamentally different operations in entity rendering: field-based mapping (always recursive, always structured) vs. direct composition (for unstructured full view modes and view entities). Introducing two named stages — `map-entity` and `compose-entity` — makes the distinction explicit and allows per-extension rules to apply at the right moment.

## What Changes

- Rename `create-view-modes.md` task to `map-entity.md` — covers all structured mappings (all view modes except `full` when `composition: unstructured`, and recursive entity refs)
- Add `compose-entity.md` task — covers `view_mode: full` + `composition: unstructured` AND all `entity_type: view` entities; routes to extension-specific rule
- Add per-extension compose rules: `rules/compose-layout-builder.md`, `rules/compose-canvas.md`, `rules/compose-view-entity.md`
- Add `rules/map-entity.md` as the general structured mapping rule (optional, since map-entity is always the same)
- Update `designbook-scenes/SKILL.md` to document the routing logic
- Update `tasks/create-scene.md` to reference both stages

## Capabilities

### New Capabilities
- `scene-entity-stages`: Two explicit stages for entity rendering — `map-entity` (field mapping, recursive) and `compose-entity` (direct composition for unstructured full + view entities)

### Modified Capabilities
- `view-mode-jsonata`: `create-view-modes.md` becomes `map-entity.md`; scope clarified to structured mappings only
- `scene-unstructured-inline`: compose-entity is now the named stage for unstructured composition; extension rules apply here

## Impact

- `.agents/skills/designbook-scenes/tasks/` — rename + new task file
- `.agents/skills/designbook-scenes/rules/` — new per-extension compose rules
- `.agents/skills/designbook-scenes/SKILL.md` — routing logic documented
