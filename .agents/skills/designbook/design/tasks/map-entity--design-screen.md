---
when:
  steps: [design-screen:map-entity]
params:
  $ref: ../schemas.yml#/EntityMapping
each:
  entity_mappings:
    $ref: ../schemas.yml#/EntityMapping
reads:
  - path: $DESIGNBOOK_DATA/data-model.yml
    workflow: debo-data-model
result:
  entity-mapping:
    path: $DESIGNBOOK_DATA/entity-mapping/{{ entity_type }}.{{ bundle }}.{{ view_mode }}.jsonata
    validators: [entity-mapping]
---

# Map Entity

Creates a JSONata expression file that maps an entity's data to `ComponentNode[]`.

## Input

- `data-model.yml` → `content.{entity_type}.{bundle}.view_modes.{view_mode}` for template name and settings

## Output

A pure JSONata expression returning `ComponentNode[]`. See [jsonata-reference](../resources/jsonata-reference.md) for output format.

## Data Mapping Pattern

Read the data-mapping blueprint from `task.blueprints[]` filtered by `type: data-mapping`. The matching blueprint provides the JSONata pattern and rules for the declared template.

## Constraints

- One file per `entity_type.bundle.view_mode` combination
- Provider prefix resolved at generation time (never leave as placeholder)
- Reference fields emit `{ "type": "entity", ... }` nodes — resolved recursively at build time
- If no matching data-mapping blueprint found for the template, stop and report the error
