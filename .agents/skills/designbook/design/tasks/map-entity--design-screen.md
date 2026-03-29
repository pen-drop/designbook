---
stage: map-entity
params:
  entity_type: ~
  bundle: ~
  view_mode: ~
reads:
  - path: $DESIGNBOOK_DATA/data-model.yml
    workflow: debo-data-model
files:
  - file: $DESIGNBOOK_DATA/entity-mapping/{{ entity_type }}.{{ bundle }}.{{ view_mode }}.jsonata
    key: entity-mapping
    validators: [entity-mapping]
---

# Map Entity

Creates a JSONata expression file that maps an entity's data to `ComponentNode[]`.

## Input

- `data-model.yml` → `content.{entity_type}.{bundle}.view_modes.{view_mode}` for template name and settings

## Output

A pure JSONata expression returning `ComponentNode[]`. See [jsonata-reference](../resources/jsonata-reference.md) for output format. Write the result via stdin to the CLI:
```
 write-file $WORKFLOW_NAME $TASK_ID --key entity-mapping
```

## Constraints

- One file per `entity_type.bundle.view_mode` combination
- Provider prefix resolved at generation time (never leave as placeholder)
- Reference fields emit `{ "type": "entity", ... }` nodes — resolved recursively at build time
- If no matching template rule found, stop and report the error
