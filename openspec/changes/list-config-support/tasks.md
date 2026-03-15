## 1. Schema

- [x] 1.1 Add `list` definition to `data-model.schema.yml` with `sources[]` (entity_type, bundle, view_mode required), optional `limit` (integer), optional `sorting` (string)
- [x] 1.2 Replace `config.views` with `config.list` in schema — remove the `view` definition
- [x] 1.3 Update schema validation tests with valid/invalid list configs

## 2. Scene Parser

- [x] 2.1 Add `ConfigSceneNode` type to `renderer/types.ts` — `{ type: 'config', config_type, config_name, view_mode }`
- [x] 2.2 Update scene parser to recognize `config:` entries and parse `list.<name>` into config_type + config_name
- [x] 2.3 Support optional `view_mode` on config nodes, defaulting to `"default"`

## 3. Config Renderer

- [x] 3.1 Create `config-renderer.ts` with `appliesTo` for `type: 'config'` nodes
- [x] 3.2 Implement multi-source record loading — iterate sources, load sample data for each entity_type.bundle
- [x] 3.3 Render each record through its source's entity view-mode JSONata, collecting into `$rows`
- [x] 3.4 Apply `limit` — slice `$rows` to limit, track `$count` as total before slicing
- [x] 3.5 Evaluate list JSONata (`list.<name>.<view_mode>.jsonata`) with bound variables `$rows`, `$count`, `$limit`
- [x] 3.6 Recursively render the resulting SceneNode via `ctx.renderNode()`
- [x] 3.7 Handle error cases: missing config, missing JSONata file, missing sample data — emit placeholder + warning

## 4. Register Renderer

- [x] 4.1 Register config renderer in the renderer registry (built-in, low priority like entity renderer)
- [x] 4.2 Add config renderer to SDC renderer preset exports

## 5. Skills Update

- [x] 5.1 Update `designbook-data-model` skill — document `config.list` section, sources format
- [x] 5.2 Update `designbook-view-modes` skill — document `list.<name>.<view_mode>.jsonata` convention and `$rows`/`$count`/`$limit` variables
- [x] 5.3 Update `designbook-scenes` skill — document `config:` node type in scenes

## 6. Tests

- [x] 6.1 Unit test: config renderer with single-source list
- [x] 6.2 Unit test: config renderer with multi-source list
- [x] 6.3 Unit test: limit applied correctly ($rows truncated, $count reflects total)
- [x] 6.4 Unit test: missing config/JSONata/sample-data error handling
- [x] 6.5 Integration test: end-to-end scene with config node renders correctly
