## Why

The `designbook-view-modes` skill is always needed alongside `designbook-scenes` — view modes define how entities render inside scenes. Keeping them as separate skills forces agents to load two skills and switch context. Merging them into a single skill makes scene creation self-contained.

## What Changes

- Move `designbook-view-modes/tasks/create-view-modes.md` into `designbook-scenes/tasks/`
- Move `designbook-view-modes/resources/jsonata-reference.md` into `designbook-scenes/resources/`
- Move `designbook-view-modes/resources/field-mapping.md` into `designbook-scenes/resources/`
- Move `designbook-view-modes/resources/list-view-modes.md` into `designbook-scenes/resources/` (or delete if superseded by view-entity.md)
- Update `designbook-scenes/SKILL.md` to include the absorbed task and resources
- Delete the `designbook-view-modes/` skill directory entirely

## Capabilities

### New Capabilities
- none

### Modified Capabilities
- `view-mode-jsonata`: The view-mode JSONata skill content moves into designbook-scenes — no requirement changes, just relocation

## Impact

- `designbook-view-modes` skill is removed
- `designbook-scenes` skill gains view-mode authoring knowledge
- Agents building scenes no longer need to load a second skill
