## ADDED Requirements

### Requirement: layout-builder and canvas use passthrough rendering for full view mode

For `view_mode: full` with `template: layout-builder` or `template: canvas`, the `map-entity` stage SHALL NOT generate a JSONata field mapping. Instead, it passes the sample data structure through directly as the component tree. All other view modes (teaser, card, listing, etc.) use the standard `field-map` template and behave identically regardless of layout system.

#### Scenario: full view mode with layout-builder or canvas — passthrough, no field mapping

- **WHEN** `map-entity` runs for a view mode where `template` is `layout-builder` or `canvas`
- **THEN** the stage SHALL output the sample data's sections structure directly as the ComponentNode tree
- **AND** SHALL NOT generate a JSONata field-mapping expression
- **AND** the sample data IS the component tree — no transformation needed

#### Scenario: non-full view modes are unaffected by layout system

- **WHEN** `map-entity` runs for a view mode with `template: field-map` (e.g. teaser, card)
- **THEN** the standard field-map rule applies regardless of which extensions are active
- **AND** layout-builder and canvas extensions have no effect on these view modes

#### Scenario: layout-builder full view mode — JSONata reads layout_builder__layout field

- **WHEN** `map-entity` runs for a node with `template: layout-builder`
- **THEN** the JSONata expression SHALL read the `layout_builder__layout` field from the sample data record
- **AND** each entry SHALL be a block_content entity reference resolved from `data.yml`
- **AND** the output SHALL be a flat `ComponentNode[]` of block_content entity nodes

#### Scenario: canvas full view mode — JSONata reads component_tree field from canvas_page entity

- **WHEN** `map-entity` runs for a `canvas_page` entity with `template: canvas`
- **THEN** the JSONata expression SHALL read the `component_tree` field from the sample data record
- **AND** `component_tree` stores a component tree inline (no separate entity type — components are direct `canvas_*` component nodes with children)
- **AND** the output SHALL be a nested `ComponentNode[]` derived directly from the `component_tree` field
- **NOTE** Canvas uses the entity type `canvas_page`, not `node` — this is a distinct content entity type provided by the Canvas module
