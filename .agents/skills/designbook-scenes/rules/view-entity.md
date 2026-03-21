---
when:
  stages: [map-entity]
  template: view-entity
---

# Rule: View Entity

Applies when a view mode declares `template: view-entity`. Generates a JSONata expression that receives `{}` as input (no sample data record) and returns a single component with inline entity refs.

## Pattern

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

- Input is always `{}` — no data.yml record needed
- Output is a **single object** (wrapper component + slots), not an array
- Slots contain inline entity refs — `resolveEntityRefs` resolves them via `map-entity`
- The wrapper component is a layout/list component from the design system
- Provider prefix must be resolved: `$DESIGNBOOK_SDC_PROVIDER:component-name`
- Entity refs use `type: entity` format with explicit `record: N` indices
