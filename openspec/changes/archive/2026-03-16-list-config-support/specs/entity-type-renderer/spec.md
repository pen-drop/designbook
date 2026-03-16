## ADDED Requirements

### Requirement: Config node renderer

The renderer registry SHALL include a `config` node handler that resolves `config` scene nodes by loading the referenced config, rendering items, and evaluating the list JSONata.

#### Scenario: Config node dispatched to config renderer

- **WHEN** the renderer encounters a node with `config: "list.recent_articles"`
- **THEN** the config renderer SHALL handle it (`appliesTo` returns true for nodes with a `config` property)

#### Scenario: Config renderer resolution pipeline

- **WHEN** the config renderer processes a `list` config node
- **THEN** it SHALL:
  1. Parse the config reference (`list.recent_articles`) into type (`list`) and name (`recent_articles`)
  2. Load the list config from `ctx.dataModel.config.list.recent_articles`
  3. For each source in `sources`: load sample data records for `entity_type.bundle`
  4. For each record: evaluate the entity view-mode JSONata (e.g., `node.article.teaser.jsonata`) to get `SceneNode[]`
  5. Collect all rendered items into `$rows` (limited by `limit` if specified)
  6. Evaluate `list.recent_articles.<view_mode>.jsonata` with bound variables `$rows`, `$count`, `$limit`
  7. Recursively render the resulting SceneNode tree via `ctx.renderNode()`

#### Scenario: Multi-source record collection

- **WHEN** a list has sources `[{node.article, teaser}, {node.event, teaser}]`
- **THEN** the renderer SHALL load records from both `node.article` and `node.event` sample data
- **AND** render each through its own entity view-mode JSONata
- **AND** interleave them in source order (all article records first, then all event records)

#### Scenario: Limit applied after collection

- **WHEN** a list has `limit: 5` and sources produce 10 total records
- **THEN** `$rows` SHALL contain only the first 5 rendered items
- **AND** `$count` SHALL be 10 (total available, not limited)

#### Scenario: Missing list config

- **WHEN** a config node references `list.nonexistent` and no such config exists in the data model
- **THEN** the renderer SHALL return `/* [config: list.nonexistent — not found in data-model] */`
- **AND** log a warning

#### Scenario: Missing list JSONata file

- **WHEN** the list config exists but `list.recent_articles.default.jsonata` is not found
- **THEN** the renderer SHALL return `/* [config: list.recent_articles — no view-mode file: list.recent_articles.default.jsonata] */`
- **AND** log a warning

#### Scenario: Missing sample data for a source

- **WHEN** a source references `node.event` but no sample data exists for `node.event`
- **THEN** that source SHALL contribute zero rows
- **AND** the renderer SHALL log a warning
- **AND** other sources SHALL still be processed

### Requirement: ConfigSceneNode type

The renderer type system SHALL include a `ConfigSceneNode` type alongside `ComponentSceneNode` and `EntitySceneNode`.

```typescript
interface ConfigSceneNode {
  type: 'config';
  config_type: string;   // e.g., "list"
  config_name: string;   // e.g., "recent_articles"
  view_mode: string;     // e.g., "default"
}
```

#### Scenario: Scene parser produces ConfigSceneNode

- **WHEN** the scene parser encounters `{ config: "list.recent_articles" }`
- **THEN** it SHALL produce `{ type: "config", config_type: "list", config_name: "recent_articles", view_mode: "default" }`

#### Scenario: Scene parser with view_mode

- **WHEN** the scene parser encounters `{ config: "list.recent_articles", view_mode: "compact" }`
- **THEN** it SHALL produce `{ type: "config", config_type: "list", config_name: "recent_articles", view_mode: "compact" }`
