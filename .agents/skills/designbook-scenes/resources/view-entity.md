# View Entity

A view entity is a JSONata file that declares its own content inline. Use it for listing pages — it wraps entity refs in a container component.

## Scene Syntax

```yaml
- entity: view.recent_articles   # entity_type: view, bundle: recent_articles
  view_mode: default              # optional, defaults to "default"
```

No `record:` field — view entities have no sample data instances.

## JSONata File

Located at `entity-mapping/view.<name>.<view_mode>.jsonata`. Receives `{}` as input (no record). Declares entity refs inline — `resolveEntityRefs` resolves them:

```jsonata
{
  "component": "my_theme:article-list",
  "slots": {
    "items": [
      { "entity": "node.article", "view_mode": "teaser", "record": 0 },
      { "entity": "node.article", "view_mode": "teaser", "record": 1 },
      { "entity": "node.article", "view_mode": "teaser", "record": 2 }
    ]
  }
}
```

## data-model.yml Entry

Register view entities under the `config:` key in `data-model.yml` (same schema as `content:`):

```yaml
config:
  view:
    recent_articles:
      composition: unstructured
```

No `data.yml` entry needed — view entities have no sample data records.

## When to Use

| Pattern | Use when |
|---------|----------|
| `entity: view.*` | Listing pages — multiple entities wrapped in a container |
| `entity: node.*` with `record: 0` | Detail pages — single entity in full view mode |
