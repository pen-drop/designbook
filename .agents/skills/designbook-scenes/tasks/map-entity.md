---
stage: map-entity
params:
  entity_type: ~
  bundle: ~
  view_mode: ~
reads:
  - path: $DESIGNBOOK_DIST/data-model.yml
    workflow: debo-data-model
files:
  - $DESIGNBOOK_DIST/entity-mapping/{{ entity_type }}.{{ bundle }}.{{ view_mode }}.jsonata
---

# Map Entity

Creates a JSONata expression file that maps an entity's data to `ComponentNode[]`.

## Input

- `data-model.yml` → `content.{entity_type}.{bundle}.view_modes.{view_mode}` for template name and settings

## Output

```
$DESIGNBOOK_DIST/entity-mapping/{{ entity_type }}.{{ bundle }}.{{ view_mode }}.jsonata
```

A pure JSONata expression returning `ComponentNode[]`. See [jsonata-reference](../resources/jsonata-reference.md) for output format.

## Constraints

- One file per `entity_type.bundle.view_mode` combination
- Provider prefix resolved at generation time (never leave as placeholder)
- Reference fields emit `{ "type": "entity", ... }` nodes — resolved recursively at build time
- If no matching template rule found, stop and report the error
