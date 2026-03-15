## ADDED Requirements

### Requirement: List view-mode JSONata files

The view-modes directory SHALL support list-level JSONata files alongside entity-level files. List JSONata files follow the naming convention `list.<name>.<view_mode>.jsonata`.

```
view-modes/
├── node.article.teaser.jsonata            # entity view mode (existing)
├── list.recent_articles.default.jsonata   # list view mode (new)
└── list.search.default.jsonata            # list view mode (new)
```

#### Scenario: List JSONata file naming

- **WHEN** a list named `recent_articles` has a `default` view mode
- **THEN** the expression file SHALL be located at `view-modes/list.recent_articles.default.jsonata`

#### Scenario: Multiple list view modes

- **WHEN** a list named `recent_articles` has both `default` and `compact` view modes
- **THEN** two files SHALL exist: `list.recent_articles.default.jsonata` and `list.recent_articles.compact.jsonata`

### Requirement: List JSONata receives pre-rendered rows

List JSONata expressions SHALL receive pre-rendered item data as bound variables, NOT raw entity records. The renderer SHALL bind the following variables before evaluation:

| Variable | Type | Description |
|----------|------|-------------|
| `$rows` | `SceneNode[][]` | Array of rendered items — each entry is the `SceneNode[]` output from one record's entity view-mode JSONata |
| `$count` | `number` | Total number of records across all sources |
| `$limit` | `number` | Limit from list config (or total count if no limit) |

#### Scenario: List JSONata accesses $rows

- **WHEN** a list JSONata expression references `$rows`
- **THEN** it SHALL receive an array where each element is the rendered SceneNode array for one record
- **AND** records from all sources SHALL be included in source order

#### Scenario: List JSONata accesses $count and $limit

- **WHEN** a list has 25 total records and `limit: 10`
- **THEN** `$count` SHALL be `25`
- **AND** `$limit` SHALL be `10`
- **AND** `$rows` SHALL contain 10 entries (the first 10 records)

#### Scenario: List JSONata returns SceneNode

- **WHEN** a list JSONata expression is evaluated
- **THEN** it SHALL return a single `SceneNode` (typically a component wrapping the rows)
- **AND** the returned node SHALL be recursively rendered by the renderer

#### Scenario: List JSONata composes wrapper components

- **WHEN** a list JSONata expression defines a view component with grid and pager slots
- **THEN** the expression SHALL use `$rows` in the content slot and component references for pager, title, etc.
- **AND** example:
```jsonata
{
  "type": "component",
  "component": "provider:view",
  "slots": {
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
