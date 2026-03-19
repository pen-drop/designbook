## 1. New task file: ensure-sample-data stage

- [x] 1.1 Create `.agents/skills/designbook-sample-data/tasks/ensure-sample-data.md` with params `section_id`, `entities` (from collect-entities), `view_configs` (view entity bundles + target entity types)
- [x] 1.2 Document the check-first logic: read existing `data.yml`, compare record counts against requirements, append only missing records
- [x] 1.3 Document view config generation: for each view entity, generate `config.view.<bundle>` record with `items_per_page` (default 6), `sort_field`
- [x] 1.4 Document content record count derivation: `required_count = max(items_per_page, 6)`; append `required_count - existing_count` records if deficit > 0
- [x] 1.5 Add `files` frontmatter: `$DESIGNBOOK_DIST/sections/{{ section_id }}/data.yml`

## 2. Update debo-design-screen workflow

- [x] 2.1 Add `ensure-sample-data` to the `stages` list in `debo-design-screen.md` frontmatter between `collect-entities` and `map-entity`
- [x] 2.2 Remove `optional: true` from the `data.yml` reads entry — data is now guaranteed by the stage itself, not a prerequisite
- [x] 2.3 Update Step 1 (section selection): show `✗ No scenes` for sections without a scenes file (block), but do NOT block on missing `data.yml` (the stage handles it)

## 3. Update debo-sample-data workflow

- [x] 3.1 Keep `debo-sample-data` as a standalone workflow for manual/incremental use
- [x] 3.2 Add a note in `debo-sample-data.md`: "For design workflows, sample data is generated automatically by `debo-design-screen`. Use this workflow to add or refresh data independently."
