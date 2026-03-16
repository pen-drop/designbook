## Why

The data model currently has no way to express "I have a list of content" — a fundamental concept in any CMS. Lists (article overviews, search results, mixed content feeds) exist as Drupal Views but have no Designbook equivalent. Without this, list pages can't be designed, previewed, or exported through the standard pipeline.

## What Changes

- Add `config.list` as a new top-level section in `data-model.yml` — each entry declares a named list with its sources (entity types, bundles, per-source view mode), limit, and sorting
- Support multiple sources per list (e.g., articles + events mixed, or cross-entity-type search results)
- Add list view-mode JSONata files (`list.<name>.<view_mode>.jsonata`) that define how the list wrapper is composed — which components for the view container, content grid/stack, pager, title, header slots
- The JSONata expression receives pre-rendered `$rows` (each source record already rendered through its entity view mode) plus metadata (`$count`, `$limit`)
- Add `config` as a third scene node type alongside `component` and `entity` — the renderer resolves it by loading the list config, rendering items, and evaluating the list JSONata
- Extend the data model schema to validate `config.list` entries

## Capabilities

### New Capabilities
- `list-config`: Data model config section for declaring lists — sources, limit, sorting. Schema validation and renderer support for `config` scene nodes.

### Modified Capabilities
- `view-mode-jsonata`: Extend the view-mode JSONata convention to cover list-level mappings (`list.<name>.<view_mode>.jsonata`), not just entity-level. The list JSONata receives `$rows` (pre-rendered items) instead of a single entity record.
- `entity-type-renderer`: Add a `config` node handler to the renderer registry that loads list config from data-model, renders N records through their entity view modes, then evaluates the list JSONata with the rendered rows.

## Impact

- **Schema**: `data-model.schema.yml` — new `config.list` definition with `sources[]`, `limit`, `sorting`
- **Renderer**: `scene-module-builder.ts` — new `config` node type handling, multi-record loading and rendering loop
- **View modes directory**: New `list.*.jsonata` file convention alongside existing `entity_type.bundle.view_mode.jsonata`
- **Skills**: `designbook-data-model` (schema + docs for config.list), `designbook-view-modes` (list JSONata authoring), `designbook-scenes` (config node in scenes)
- **Sample data**: Lists reuse existing entity sample data — no new data format needed
