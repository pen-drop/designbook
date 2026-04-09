## Why

Several rule files define overridable structure (entity-type definitions, CSS mappings, CSS naming conventions, data-mapping patterns) but live as plain rules. Rules have no priority-based deduplication — if two skills define the same rule with the same `when` condition, both are loaded and the agent sees conflicting instructions. The blueprint system already solves this with `type:name` dedup and priority layering. Converting these structure-defining rules to blueprints enables clean project-level overrides without skill forking.

## What Changes

- **Entity-type definitions** (6 files): Move from `designbook-drupal/data-model/entity-types/rules/` to `designbook-drupal/blueprints/` as `type: entity-type`
- **CSS mapping** (2 files): Move from `designbook-css-tailwind/rules/css-mapping.md` and `designbook-css-daisyui/rules/css-mapping.md` to respective `blueprints/` as `type: css-mapping`
- **CSS naming** (2 files): Move from `designbook-css-tailwind/rules/tailwind-naming.md` and `designbook-css-daisyui/rules/daisyui-naming.md` to respective `blueprints/` as `type: css-naming`
- **Data-mapping patterns** (4 files): Move from `designbook-drupal/data-mapping/rules/` to `designbook-drupal/blueprints/` as `type: data-mapping`
- Update consuming tasks (`create-data-model`, `generate-jsonata`, `create-tokens`, `map-entity`) to read blueprints from `task.blueprints[]` instead of relying on implicitly loaded rules
- Remove empty rule directories

## Capabilities

### New Capabilities

_None — uses existing blueprint infrastructure._

### Modified Capabilities

- `drupal-entity-type-schemas`: Entity-type definitions change from rule files to blueprint files with `type: entity-type`

## Impact

- **Skills affected**: `designbook-drupal`, `designbook-css-tailwind`, `designbook-css-daisyui`
- **Tasks affected**: `create-data-model`, `generate-jsonata`, `create-tokens`, `map-entity`
- **No code changes**: `matchBlueprintFiles()` already handles arbitrary `type` values
- **Not breaking**: Same content, different delivery mechanism
