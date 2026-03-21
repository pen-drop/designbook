## Context

The `config: list.*` system was built as a query-engine inside a preview tool. It introduced a separate builder (`config-list-builder.ts`), a separate scene node type (`config:`), and a separate data-model section (`config:`). All of this to aggregate sample data records and pass them as pre-built `ComponentNode[]` to a JSONata wrapper file.

The insight: Designbook is a preview tool, not a query engine. A "listing view" is just a JSONata file that declares which entities it wants to show — inline, statically. `resolveEntityRefs` already handles nested entity refs everywhere in the system. There is no need for a separate aggregation pipeline.

## Goals / Non-Goals

**Goals:**
- Remove `config-list-builder.ts` and all associated types
- Remove `config:` as a scene node type — `entity:` covers everything
- Remove `config:` from data-model.yml schema
- Establish `view.<name>.<view_mode>.jsonata` as the convention for view entities
- Builder passes `{}` when no data.yml record exists — no special-casing

**Non-Goals:**
- No runtime query execution or dynamic data fetching
- No changes to `resolveEntityRefs` — it already handles nested entity refs
- No changes to how structured or unstructured entity nodes work
- No changes to the shell/section scene structure

## Decisions

### View entity: JSONata without input

A `view.*` entity has no records in `data.yml`. The builder passes `{}` as input. The JSONata file is self-contained — it declares entity refs inline:

```jsonata
{
  "component": "my_theme:article-list",
  "slots": {
    "items": [
      { "entity": "node.article", "view_mode": "teaser", "record": 0 },
      { "entity": "node.article", "view_mode": "teaser", "record": 1 }
    ]
  }
}
```

`resolveEntityRefs` resolves those entity refs exactly as it does everywhere else.

**Why not keep $rows/$count/$limit?** Those bindings required pre-building ComponentNodes in the builder before passing them to JSONata. That forced the builder to run entity resolution twice (once per source record, once for the wrapper). The new model runs entity resolution once at the end, uniformly.

### Builder: no special case for view entities

The entity builder already loads `data.yml[entity_type][bundle][record]`. If no record is found (entity_type is `view`, nothing in data.yml), it passes `{}`. No `if entity_type === 'view'` guard. The builder is unaware of the distinction.

**Why not add a `view` section to data.yml?** Unnecessary indirection. The JSONata file IS the view definition. Adding a data.yml entry would duplicate what the JSONata already expresses.

### Naming: `view.<name>` as entity_type.bundle

`entity: view.recent_articles` in scenes.yml. JSONata at `view-modes/view.recent_articles.default.jsonata`. Consistent with `entity_type.bundle.view_mode` naming used everywhere.

**Why `view` over `list` or `config`?** `list` is too narrow (views could wrap single entities or mixed content). `config` is the Drupal term for a different concept. `view` maps to Drupal's View config entity and is semantically correct.

### data-model.yml: remove config section

The `config:` section in data-model.yml served two purposes: runtime aggregation (eliminated) and documentation of what lists exist. The JSONata file now serves as the documentation. No replacement needed.

## Risks / Trade-offs

- Existing `config: list.*` nodes in `*.scenes.yml` files are breaking changes — need migration → All internal fixtures updated as part of this change
- `list.<name>.<view_mode>.jsonata` files need renaming → Handled in task list (fixtures only, no user projects yet)
- The `$rows/$count/$limit` JSONata API is removed → Authors rewrite list JSONata files to declare entity refs inline (simpler)

## Migration Plan

For any existing `*.scenes.yml` using `config: list.X`:
```yaml
# Before
- config: list.recent_articles
  view_mode: default

# After
- entity: view.recent_articles
  view_mode: default
```

For any existing `list.X.Y.jsonata`:
```jsonata
// Before (receives $rows: ComponentNode[])
{ "component": "...", "slots": { "items": $rows } }

// After (no input — declare entity refs inline)
{
  "component": "...",
  "slots": {
    "items": [
      { "entity": "node.article", "view_mode": "teaser", "record": 0 }
    ]
  }
}
```
