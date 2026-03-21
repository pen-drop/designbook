## ADDED Requirements

### Requirement: Listing scenes use config:list

Scene files (`*.scenes.yml`) that represent listing pages SHALL use a `config: list.*` node, not `entity + records` arrays. The `records` shorthand is only valid for component demos or isolated entity previews.

#### Scenario: Listing scene with config:list

- **WHEN** a scene is generated for a listing page (e.g. "Blog Listing", "Product Overview")
- **THEN** the scene items SHALL contain a `config: list.<name>` node
- **AND** the `config` value SHALL reference a named list defined in `data-model.yml` under `config.list`
- **AND** the scene SHALL NOT use `entity + records: [0, 1, 2]` for this purpose

#### Scenario: Detail scene with entity

- **WHEN** a scene is generated for a single-entity detail page (e.g. "Blog Detail", "Product Detail")
- **THEN** the scene items SHALL use an `entity` node with a single `record` index
- **AND** `records` array shorthand SHALL NOT be used for detail scenes

#### Scenario: create-scene task generates config:list for listings

- **WHEN** the `create-scene` task generates a listing-type scene
- **THEN** the generated YAML SHALL use `config: list.<name>` as the content node
- **AND** the task template SHALL NOT use `entity + records: []` as the listing pattern

### Requirement: designbook-scenes skill resources are split by concern

The `designbook-scenes` skill SHALL organize its resources as separate focused files rather than a single monolithic reference.

#### Scenario: field-reference.md contains only field tables

- **WHEN** an agent loads `field-reference.md`
- **THEN** it SHALL find only YAML field tables for file-level and scene-level fields
- **AND** it SHALL NOT contain entry type documentation or full scene examples

#### Scenario: entry-types.md documents all entry types

- **WHEN** an agent loads `entry-types.md`
- **THEN** it SHALL find documentation for: component, entity, records, config, and scene-ref entry types
- **AND** it SHALL explicitly note that `records` is for demos only, not listing pages

#### Scenario: config-list.md documents the full config:list contract

- **WHEN** an agent loads `config-list.md`
- **THEN** it SHALL find: syntax, data-model mapping, sources structure, JSONata bindings ($rows, $count, $limit), and guidance on when to use config:list vs entity
