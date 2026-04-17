---
trigger:
  steps: [design-screen:map-entity]
params:
  type: object
  required: [mapping, data_model]
  properties:
    mapping:
      type: object
      $ref: ../schemas.yml#/EntityMapping
    data_model:
      path: $DESIGNBOOK_DATA/data-model.yml
      workflow: debo-data-model
      type: object
each:
  mapping:
    expr: "entity_mappings"
    schema: { $ref: ../schemas.yml#/EntityMapping }
result:
  type: object
  required: [entity-mapping]
  properties:
    entity-mapping:
      path: "$DESIGNBOOK_DATA/entity-mapping/{{ mapping.entity_type }}.{{ mapping.bundle }}.{{ mapping.view_mode }}.jsonata"
      validators: [entity-mapping]
---

# Map Entity

Creates a JSONata expression file that maps an entity's data to `ComponentNode[]`.

## Input

- `data-model.yml` → `content.{{ mapping.entity_type }}.{{ mapping.bundle }}.view_modes.{{ mapping.view_mode }}` for template name and settings

## Output

A pure JSONata expression returning `ComponentNode[]`. See [jsonata-reference](../resources/jsonata-reference.md) for output format.

## Data Mapping Pattern

Read the data-mapping blueprint from `task.blueprints[]` filtered by `type: data-mapping`. The matching blueprint provides the JSONata pattern and rules for the declared template.

## Constraints

- One file per `entity_type.bundle.view_mode` combination
- Provider prefix resolved at generation time (never leave as placeholder)
- Reference fields emit `{ "entity": "<entity_type>.<bundle>", "view_mode": "...", "record": N }` nodes — resolved recursively at build time
- If no matching data-mapping blueprint found for the template, stop and report the error
