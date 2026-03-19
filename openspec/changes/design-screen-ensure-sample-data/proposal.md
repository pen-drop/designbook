## Why

`debo-design-screen` currently assumes sample data exists before design begins, but `debo-sample-data` runs blind — it doesn't know how many records are needed or what view config is required. The result: views render empty because `config.view.*` is missing or `items_per_page` doesn't drive enough content records.

## What Changes

- `debo-design-screen` gains an `ensure-sample-data` stage that runs after `collect-entities` and before `map-entity`
- The stage determines exact data requirements from the design intent: which entity types, which view configs, how many content records per listing view
- View config entities (`config.view.*`) are generated with meaningful fields (`items_per_page`, `sort_field`, etc.)
- Content record count is derived from `items_per_page` in view config, not from a fixed heuristic
- `debo-sample-data` as a standalone workflow remains for manual/incremental use, but is no longer a prerequisite gate for `debo-design-screen`
- `debo-design-screen` Step 1 (section selection) blocks sections without a scenes file but no longer requires pre-existing `data.yml`

## Capabilities

### New Capabilities

- `ensure-sample-data`: Stage within `debo-design-screen` that checks and generates sample data based on design intent — entity types, view configs with `items_per_page`, and the resulting content record counts

### Modified Capabilities

- `workflow-skill`: `debo-design-screen` stages list gains `ensure-sample-data` between `collect-entities` and `map-entity`

## Impact

- `.agents/workflows/debo-design-screen.md` — new stage + updated stage list
- `.agents/skills/designbook-sample-data/tasks/ensure-sample-data.md` — new task file for the stage
- `debo-sample-data` workflow reads dependency on `section.scenes.yml` remains unchanged
