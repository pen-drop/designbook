# List View Modes

Lists also use JSONata files, following the same pattern but with different naming and input:

> **Naming**: `list.{list_name}.{view_mode}.jsonata`

| List | View Mode | File |
|------|-----------|------|
| recent_articles | default | `view-modes/list.recent_articles.default.jsonata` |
| search | default | `view-modes/list.search.default.jsonata` |
| recent_articles | compact | `view-modes/list.recent_articles.compact.jsonata` |

### Input Variables

List expressions receive pre-rendered rows (NOT raw entity records) as bound variables:

| Variable | Type | Description |
|----------|------|-------------|
| `$rows` | array | Pre-rendered items — each record already processed through its entity view-mode JSONata |
| `$count` | number | Total number of records across all sources |
| `$limit` | number | Limit from list config (or total count if no limit) |

### Expression Format

A list expression returns a single `SceneNode` (typically a wrapper component):

```jsonata
/* view-modes/list.recent_articles.default.jsonata */
{
  "type": "component",
  "component": "view",
  "slots": {
    "title": "Recent Articles",
    "content": {
      "type": "component",
      "component": "grid",
      "props": { "columns": 3 },
      "slots": { "items": $rows }
    },
    "pager": {
      "type": "component",
      "component": "pager",
      "props": { "total": $count, "limit": $limit }
    }
  }
}
```
