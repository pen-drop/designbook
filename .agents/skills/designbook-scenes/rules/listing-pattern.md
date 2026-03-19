---
when:
  stages: [create-scene]
---

# Rule: Listing Scenes Use view entities

Listing scenes SHALL use `entity: view.*` as the content node. Never use `entity + records: []` for listing pages.

## Required

```yaml
- entity: view.recent_articles   # ✅ correct
  view_mode: default
```

## Forbidden

```yaml
- entity: node.article           # ❌ forbidden for listing pages
  view_mode: teaser
  records: [0, 1, 2]
```

## Why

`records` shorthand is for **component demos only** — isolated previews of a single component. Listing pages use `entity: view.*` — a view entity is a JSONata file that declares its own entity refs inline. No data.yml entry needed, no config section in data-model.
