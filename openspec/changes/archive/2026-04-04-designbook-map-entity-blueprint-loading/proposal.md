## Why

During `design-screen home`, the `map-entity` stage failed to load the `canvas.md` data-mapping blueprint. The blueprint exists at `designbook-drupal/data-mapping/blueprints/canvas.md` with `when.steps: [map-entity]`, but the CLI's plan resolution did not include it in `step_resolved.blueprints[]`. The agent had to manually search for and read the blueprint via grep.

The root cause: `workflow-plan-resolution` spec defines rule matching (`rules/*.md` scanned by `when.stages`), but has no equivalent requirement for blueprint matching (`blueprints/*.md`). The CLI only loads blueprints declared in the workflow frontmatter's `steps` block, not by scanning `when.steps` conditions like it does for rules.

## What Changes

- **Add blueprint scanning to plan resolution** — `workflow plan` SHALL scan `blueprints/*.md` frontmatter and match by `when.steps` (same mechanism as rules). Matched blueprints are stored in each task's `blueprints[]` array.
- **Ensure `map-entity` stage loads data-mapping blueprints** — `canvas.md`, `field-map.md`, `layout-builder.md`, and `views.md` all have `when.steps: [map-entity]` and `type: data-mapping`. After this change, the correct blueprint is auto-loaded based on the entity's template type.

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `workflow-plan-resolution`: Add blueprint scanning alongside rule scanning during plan resolution.

## Impact

- **Affected code**: `packages/storybook-addon-designbook/` — the `workflow plan` resolver in the CLI TypeScript code
- **Affected spec**: `openspec/specs/workflow-plan-resolution/spec.md`
- **Risk**: Low — blueprints are already loaded for other stages (e.g., intake loads `section.md`, `grid.md`, `container.md` correctly via the workflow frontmatter). This change adds automatic scanning as a fallback.
