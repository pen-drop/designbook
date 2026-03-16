## Context

The renderer currently handles two scene node types: `component` (direct UI) and `entity` (single record → JSONata → components). Lists — collections of content rendered through a wrapper — have no representation in the system.

The data model schema already has a `config` section with `views` support, but it's minimal and Drupal-specific. The view-mode JSONata pipeline processes single records. There is no mechanism for rendering N records into a wrapper component.

Key existing specs:
- `view-mode-jsonata`: Defines `.jsonata` files as `entity_type.bundle.view_mode.jsonata`, receiving a single record, returning `ComponentNode[]`
- `entity-type-renderer`: Renderer registry with `component` and `entity` handlers, recursive resolution
- `bundle-composition`: Structured vs unstructured bundles
- `recursive-entity-resolution`: Recursive entity node resolution in slots and JSONata output

## Goals / Non-Goals

**Goals:**
- Let users declare lists in `data-model.yml` under `config.list` — what content is listed, from which sources
- Support multi-bundle and multi-entity-type sources (simple article list through to cross-type search results)
- Render lists through the same JSONata pipeline — list-level JSONata defines the wrapper layout (view, grid, pager components)
- Add `config` as a third scene node type that the renderer resolves

**Non-Goals:**
- Filters, exposed filters, contextual filters (runtime concerns, not design-time)
- Sorting implementation details (just a declarative hint in the config)
- Ajax/infinite scroll behavior
- Server-side query building — this is sample data rendering only

## Decisions

### 1. Lists live in `config.list`, replacing `config.views`

The existing `config.views` is Drupal-specific naming. Replace with `config.list` — framework-agnostic and descriptive.

**Alternative considered**: Keep `views` alongside `list` — rejected because they model the same concept with different names.

### 2. Each source declares its own view_mode

A list can pull from multiple entity types and bundles. Each source specifies how its items are rendered:

```yaml
config:
  list:
    search:
      sources:
        - entity_type: node
          bundle: article
          view_mode: search_result
        - entity_type: node
          bundle: event
          view_mode: search_result
        - entity_type: media
          bundle: document
          view_mode: search_result
      limit: 20
```

The renderer processes each source's records through their respective entity view-mode JSONata, producing a flat `$rows` array of pre-rendered SceneNode arrays.

### 3. List JSONata receives `$rows`, not raw records

The list JSONata expression does NOT process raw entity data. It receives:

| Variable | Type | Description |
|----------|------|-------------|
| `$rows` | `SceneNode[][]` | Each entry is the rendered output of one record (already processed through entity view mode) |
| `$count` | `number` | Total number of records available |
| `$limit` | `number` | Limit from config |

This separation is key: entity view modes handle field-to-component mapping, list view modes handle wrapper layout. The list JSONata only knows about components — view, grid, pager, etc.

```jsonata
/* list.recent_articles.default.jsonata */
{
  "type": "component",
  "component": "provider:view",
  "slots": {
    "title": "Recent Articles",
    "content": {
      "type": "component",
      "component": "provider:grid",
      "props": { "columns": 3 },
      "slots": { "items": $rows }
    },
    "pager": {
      "type": "component",
      "component": "provider:pager",
      "props": { "total": $count, "limit": $limit }
    }
  }
}
```

### 4. List JSONata file naming: `list.<name>.<view_mode>.jsonata`

Follows the same convention as entity view modes but with `list.` prefix instead of `entity_type.bundle.`:

```
view-modes/
├── node.article.teaser.jsonata          # entity view mode
├── node.article.full.jsonata            # entity view mode
├── list.recent_articles.default.jsonata # list view mode
└── list.search.default.jsonata          # list view mode
```

### 5. `config` scene node type — thin reference

In scenes, a config node is just a reference:

```yaml
# Standalone
- config: list.recent_articles

# Embedded in layout
- component: provider:section
  slots:
    column_1:
      - config: list.recent_articles
```

The renderer resolves it by:
1. Parsing `list.recent_articles` → config type `list`, name `recent_articles`
2. Loading the list config from `data-model.yml`
3. For each source: loading sample data records, rendering each through its entity view mode
4. Collecting all rendered items into `$rows`
5. Evaluating `list.recent_articles.default.jsonata` with `$rows`, `$count`, `$limit`
6. Recursively rendering the resulting SceneNode tree

### 6. Config node supports view_mode override

```yaml
- config: list.recent_articles
  view_mode: compact    # override default → uses list.recent_articles.compact.jsonata
```

Default view_mode is `default` if not specified.

## Risks / Trade-offs

**[Mixed-source sorting is declarative only]** → The `sorting` field in config is a hint for documentation/export. In Storybook preview, records appear in sample data order. This is acceptable because sample data is hand-crafted to demonstrate the intended order.

**[$rows flattening across sources]** → When multiple sources contribute rows, they're interleaved in sample data order, not sorted. → Mitigation: Sample data authors control the order by arranging records intentionally.

**[Schema migration from config.views to config.list]** → The existing `config.views` schema is barely used (only in test fixtures). → Clean replacement, no migration needed.
