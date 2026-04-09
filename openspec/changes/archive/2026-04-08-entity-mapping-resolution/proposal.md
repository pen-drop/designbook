## Why

During a `design-screen home` workflow run, the entity-mapping stage failed because entity params (`entity_type`, `bundle`, `view_mode`) were null. The scene definition contained all necessary information (`entity: "canvas_page.home"`, `view_mode: "full"`), but the workflow had no mechanism to derive entity params from scenes. The agent concluded "nothing to map" and tried to skip the stage — but entity mappings must always exist, even for canvas pages where the mapping is a simple passthrough (`$record.components`).

A canvas data-mapping blueprint already describes the exact passthrough pattern, but it never activates because the template value (`canvas`) is never resolved when params are null.

Secondary issue: the Storybook addon's Vite plugin does not watch the `entity-mapping/` directory, so files added during a workflow run require a full Storybook restart to take effect.

## What Changes

- **map-entity task**: Add guidance that entity params must be derived from scene definitions when not explicitly provided. The scene's `content.entity` field contains `{entity_type}.{bundle}` and `content.view_mode` contains the view mode.
- **map-entity task**: Remove the option to skip — entity mappings are mandatory for every entity/view_mode combination referenced in scenes.
- **Workflow plan resolution**: Entity-mapping stage should auto-resolve params from scene content references, similar to how component params are derived from intake.
- **Vite plugin watcher**: Add `entity-mapping/` to the watched directories so new JSONata files trigger hot-reload without Storybook restart.
- **Vite plugin FILE_TYPES**: Add `entityMapping: 'entity-mapping/**/*.jsonata'` to the hot-reload type registry.

## Capabilities

### New Capabilities

- `entity-param-resolution`: Entity-mapping stage auto-derives `entity_type`, `bundle`, and `view_mode` from scene content references. Collects all unique entity/view_mode combinations across all scenes in the section.

### Modified Capabilities

- `map-entity-task`: Task instructions clarify that entity params come from scenes, that mappings are mandatory, and that the data-mapping blueprint must be consulted for the template pattern.
- `addon-file-watcher`: Vite plugin watches `entity-mapping/` directory and registers `*.jsonata` files for hot-reload events.

## Impact

- **Skill tasks**: `.agents/skills/designbook/design/tasks/map-entity--design-screen.md` — param resolution guidance, mandatory mapping
- **Addon source**: `packages/storybook-addon-designbook/src/vite-plugin.ts` — watcher config (~line 152), FILE_TYPES registry (~line 138)
- **No breaking changes**: Existing entity mappings continue to work, new guidance is additive
