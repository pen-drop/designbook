# Entity Type Renderer

> Replaces the current entity skill's story-generation pipeline with a runtime `storyNodesRenderer` that resolves entity display mappings from `data-model.json` against sample data from `data.json`.

## Background

The current entity rendering pipeline is fragile and produces excessive file output:

1. AI generates **template stories** with `type: ref` bindings
2. A Node.js script (`generate-stories.js`) **materializes** them into concrete story files
3. Screen stories reference the **generated** story files by name

This creates N × M × R files (entities × view modes × records), requires a manual build step, pollutes the Storybook sidebar, and breaks silently on naming mismatches.

The new approach embeds the field-to-component mapping directly in `data-model.json` and resolves it at render time via a `storyNodesRenderer` plugin.

---

## Phase 1: Prototype (Integration-level)

### Requirement: Data Model Schema Extension — `view_modes`

The data model schema (`data-model.json`) SHALL be extended to support a `view_modes` property on each bundle. Each view mode contains a `mapping` array of component entries.

#### Mapping Entry Format

Each mapping entry is an object with:
- `component` (string, required) — component name (without provider prefix)
- `props` (object, optional) — static values or `$field_name` references
- `slots` (object, optional) — static values, `$field_name` references, or nested component arrays

```yaml
view_modes:
  full:
    mapping:
      - component: figure
        props:
          src: $field_media.url
          alt: $field_media.alt
          full_width: true

      - component: heading
        props:
          level: h1
        slots:
          text: $title

      - component: text-block
        slots:
          content: $body

    includes:
      - component: contact-card
        entity: block_content.contact_person
        record: 0
        props:
          name: $field_name
          email: $field_email
```

#### Scenario: Mapping is an ordered array
- **GIVEN** a bundle with `view_modes.full.mapping` containing 3 entries
- **THEN** the renderer outputs components in array order (index 0 first, index 2 last)

#### Scenario: Field references use $-syntax
- **GIVEN** a mapping entry with `props.src: $field_media.url`
- **AND** `data.json` contains `node.article[0].field_media.url = "/photo.jpg"`
- **WHEN** the renderer resolves record 0
- **THEN** `props.src` resolves to `"/photo.jpg"`

#### Scenario: Slots support nested components
- **GIVEN** a mapping entry with slots containing a component array
- **THEN** the renderer recursively resolves nested components
- **AND** `$field_name` references in nested components resolve against the same entity record

#### Scenario: Static values pass through
- **GIVEN** a mapping entry with `props.full_width: true`
- **THEN** the value `true` passes through unchanged (no `$` prefix = literal)

#### Scenario: Cross-entity includes
- **GIVEN** a view mode with an `includes` array entry referencing `block_content.contact_person`
- **AND** `data.json` contains `block_content.contact_person[0]`
- **WHEN** the renderer processes `includes`
- **THEN** it resolves `$field_name` references against the specified entity/record in `data.json`
- **AND** appends the resolved component after the mapping entries

---

### Requirement: Entity Type Renderer (`entityRenderer.js`)

The system SHALL provide an `entityRenderer.js` file in the integration's `.storybook/` directory that exports a `storyNodesRenderer` compatible with `storybook-addon-sdc`.

#### Scenario: Renderer applies to `type: entity` nodes
- **GIVEN** a story YAML with a node `{type: entity, entity_type: node, bundle: article, view_mode: full, record: 0}`
- **WHEN** the SDC addon encounters this node
- **THEN** the `entityRenderer` handles it (`appliesTo` returns true)

#### Scenario: Renderer expands to component array
- **GIVEN** a `type: entity` node for `node/article/full/record:0`
- **AND** `data-model.json` has `content.node.article.view_modes.full.mapping` with 3 entries
- **AND** `data.json` has `node.article[0]` with field values
- **WHEN** the renderer processes the node
- **THEN** it returns an array of resolved `{type: component, component: ..., props: ..., slots: ...}` nodes

#### Scenario: Component provider prefix
- **GIVEN** the renderer is configured with a `provider` option (e.g., `test_integration_drupal`)
- **WHEN** it generates component nodes
- **THEN** each `component` value is prefixed with the provider: `test_integration_drupal:heading`

#### Scenario: Missing data.json
- **GIVEN** a `type: entity` node referencing an entity with no sample data
- **WHEN** the renderer processes the node
- **THEN** it returns a placeholder indicating missing data: `[entity: node/article — no sample data]`

---

### Requirement: Screen Story Integration

Screen stories SHALL use `type: entity` instead of `type: component` with generated story references.

#### Scenario: Screen story references entity
```yaml
# section-blog.detail.story.yml
name: detail
slots:
  header:
    - type: component
      component: 'test_integration_drupal:header'
      story: default
  content:
    - type: entity
      entity_type: node
      bundle: article
      view_mode: full
      record: 0
  footer:
    - type: component
      component: 'test_integration_drupal:footer'
      story: default
```

- **WHEN** the SDC addon renders this story
- **THEN** the `entityRenderer` expands `type: entity` into a component array
- **AND** the result renders identically to the current generated-story approach

---

### Requirement: Storybook Main Configuration

The `entityRenderer` SHALL be registered as a `storyNodesRenderer` in `.storybook/main.js`.

```js
import { entityRenderer } from './entityRenderer.js';

sdcStorybookOptions: {
  storyNodesRenderer: [
    ...entityRenderer({
      dataModelPath: 'designbook/data-model.json',
      sectionsPath: 'designbook/sections',
      provider: 'test_integration_drupal',
    }),
    // ... other renderers (icon, etc.)
  ]
}
```

---

## Phase 2: Addon API & Resolver (future)

### Requirement: Shared Resolver in `storybook-addon-designbook`

The entity resolution logic SHALL be extracted into `storybook-addon-designbook` as a framework-agnostic API.

```
storybook-addon-designbook/
  src/entity/
    resolver.ts      — resolveMapping(): pure JS logic
    types.ts         — EntityConfig, MappingEntry, ResolvedNode
  entity/renderers/
    sdc.ts           — SDC storyNodesRenderer adapter
    react.tsx        — React <EntityView /> component (future)
```

#### Scenario: SDC adapter usage
```js
import { createEntityRenderer } from 'storybook-addon-designbook/entity/renderers/sdc';
```

#### Scenario: React adapter usage
```jsx
import { EntityView } from 'storybook-addon-designbook/entity/renderers/react';
<EntityView entityType="node" bundle="article" viewMode="full" record={0} />
```

---

## What Becomes Obsolete (Phase 1 Complete)

| Component | Status |
|-----------|--------|
| `generate-stories.js` | Removed — no build step needed |
| Generated story files (`content_*_*.story.yml`) | Removed — runtime resolution |
| Entity template stories (`.full.story.yml`, `.teaser.story.yml`) | Removed — mapping in data model |
| `entity-*` component directories (`.component.yml`, `.twig`) | Removed — no entity wrapper needed |
| `refRenderer.js` | Removed — no `type: ref` mechanism |
| Entity SKILL (story authoring parts) | Simplified — only data model mapping authoring |
## Requirements
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

