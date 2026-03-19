---
when:
  stages: [compose-entity]
---

# Rule: View Entity Composition

Applies when composing an entity with `entity_type: view` (e.g. `entity: view.recent_articles`).

## Pattern

A view entity is backed by a JSONata file that receives `{}` as input and returns a component tree with inline entity refs. No sample data record needed.

**File:** `$DESIGNBOOK_DIST/view-modes/view.{{ bundle }}.{{ view_mode }}.jsonata`

```jsonata
{
  "component": "provider:article-list",
  "slots": {
    "items": [
      { "type": "entity", "entity_type": "node", "bundle": "article", "view_mode": "teaser", "record": 0 },
      { "type": "entity", "entity_type": "node", "bundle": "article", "view_mode": "teaser", "record": 1 },
      { "type": "entity", "entity_type": "node", "bundle": "article", "view_mode": "teaser", "record": 2 }
    ]
  }
}
```

## Rules

- Input is always `{}` — no data.yml record
- Output is a single object (wrapper component + slots), not an array
- Slots contain inline entity refs — `resolveEntityRefs` resolves them via `map-entity`
- The wrapper component is a layout/list component from the design system
- Register the view entity in `data-model.yml` under `config.view.{{ bundle }}` with `composition: unstructured`
