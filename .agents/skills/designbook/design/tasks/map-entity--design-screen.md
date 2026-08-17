---
title: "Map Entity: {{ mapping.entity_type }}.{{ mapping.bundle }}.{{ mapping.mode_kind = 'form' ? mapping.form_mode : mapping.view_mode }}"
trigger:
  steps: [design-screen:map-entity, design-entity:map-entity]
domain: [data-mapping]
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
      path: "$DESIGNBOOK_DATA/{{ mapping.mode_kind = 'form' ? 'form-mapping' : 'entity-mapping' }}/{{ mapping.entity_type }}.{{ mapping.bundle }}.{{ mapping.mode_kind = 'form' ? mapping.form_mode : mapping.view_mode }}.jsonata"
      validators: [entity-mapping]
---

# Map Entity

Creates a JSONata expression file that maps an entity's data to `ComponentNode[]`.

## Input

- `data-model.yml` → the chosen half of `content.{{ mapping.entity_type }}.{{ mapping.bundle }}`: `form_modes.{{ mapping.form_mode }}` when `mapping.mode_kind` is `form`, else `view_modes.{{ mapping.view_mode }}` — for template name and settings

## Output

A pure JSONata expression returning `ComponentNode[]`. See [jsonata-reference](../resources/jsonata-reference.md) for output format.

## Data Mapping Pattern

Read the data-mapping blueprint from `task.blueprints[]` filtered by `type: data-mapping`. The matching blueprint provides the JSONata pattern and rules for the declared template.

## Constraints

- One file per `entity_type.bundle.<mode>` combination, where `<mode>` is the `view_mode` or `form_mode` selected by `mapping.mode_kind`
- Provider prefix resolved at generation time (never leave as placeholder)
- Reference fields emit `{ "entity": "<entity_type>.<bundle>", "view_mode": "...", "record": N }` nodes **in a slot of the wrapping component, never in `props`** — resolved recursively at build time (refs in `props` are never resolved; see scenes-constraints)
- If no matching data-mapping blueprint found for the template, stop and report the error
