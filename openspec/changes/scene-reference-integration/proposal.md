## Why

Scenes have no link to their design reference (Stitch screen, Figma frame, image). When running visual regression tests (`debo-test`), the AI must guess which design screen to compare against. This is error-prone and requires manual matching every time. By adding a `reference` field to each scene, tests can automatically resolve the design reference — no guessing, no manual params.

## What Changes

- Add `reference` field to scene entries in `*.scenes.yml` (type, screen/url, title)
- Update `debo-design-screen` intake to ask users for a design reference per scene when `guidelines.yml` declares a `design_file` or `mcp` server
- Update `debo-test` visual-diff task to read `reference` from the scene instead of requiring `stitch_screen` as a param
- Support multiple reference types: `stitch` (MCP), `image` (URL/path), `figma` (URL)

## Capabilities

### New Capabilities
- `scene-reference`: Scene-level design reference field — schema, resolution logic, and integration with intake and test workflows

### Modified Capabilities
- `scene-conventions`: Add `reference` as an optional field in the scene format

## Impact

- **Skills affected**: `designbook-design-screen` (intake.md), `designbook-test` (visual-diff.md), `designbook-scenes` (create-section-scene.md, create-shell-scene.md)
- **Scene files**: All `*.scenes.yml` gain an optional `reference` field per scene entry
- **No breaking changes**: `reference` is optional — existing scenes without it still work, `debo-test` falls back to manual matching
