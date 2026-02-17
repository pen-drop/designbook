## Why

The `designbook-entity` skill currently creates **one slot per field** in entity design components (e.g., `field_title`, `field_body`, `field_image` are all separate slots). This produces a rigid 1:1 mapping that doesn't reflect how content actually renders — as a single, flowing content area. The story files must then hardcode every component reference with inline prop values, making them verbose, fragile, and disconnected from the sample data in `data.json`.

The fix: entity components should have a **single `content` slot**, and the story renderer should automatically resolve field references from test data, producing realistic previews without manual prop wiring.

## What Changes

- **BREAKING**: Entity design components change from N slots (one per field) to a single `content` slot
- Introduce a new story node type `type: ref` that references fields from test data instead of hardcoding values
- Add a `designbook` metadata block in `.story.yml` files that declares the test data source, entity type, and bundle
- Build a new **story renderer** (extending the existing `renderer.js` pattern) that resolves `ref` nodes at render time: loading `data.json`, looking up the entity record, and mapping field values to UI component props
- Update the `loadDesignComponentYml` function in `vite-plugin.ts` to actually render story YAML (slots/props/components) into real HTML — the current implementation only outputs a text placeholder

## Capabilities

### New Capabilities
- `entity-story-renderer`: A Storybook renderer that resolves `type: ref` story nodes by loading test data from `data.json` and mapping fields to UI component props via a field-type-to-component mapping. Extends the existing `renderer.js` hook system.
- `entity-content-slot`: Entity design components use a single `content` slot instead of per-field slots. The story composes all UI components sequentially inside this one slot.

### Modified Capabilities
- `designbook-entity`: Skill instructions change from per-field-slot generation to single-content-slot generation with `type: ref` nodes and `designbook:` metadata block

## Impact

- **Skill**: `.agent/skills/designbook-entity/SKILL.md` — rewrite entity generation logic
- **Addon**: `packages/storybook-addon-designbook/src/vite-plugin.ts` — enhance `loadDesignComponentYml` to render stories as HTML from YAML
- **Integration**: `packages/integrations/test-integration-drupal/.storybook/renderer.js` — add `ref` node renderer
- **Existing entity components**: All entity `.component.yml` / `.story.yml` / `.twig` in `design/entity/` must be regenerated using the new pattern
- **Dependencies**: `data.json` files per section become a hard requirement (not optional) for entity rendering
