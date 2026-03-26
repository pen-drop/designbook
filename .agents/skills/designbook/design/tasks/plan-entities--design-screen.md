---
stage: plan-entities
reads:
  - path: $DESIGNBOOK_DIST/data-model.yml
    workflow: debo-data-model
  - path: $DESIGNBOOK_DIST/sections/[section-id]/[section-id].section.scenes.yml
    workflow: debo-shape-section
---

# Plan Entities

Build the complete entity-mapping work list before any JSONata files are written.

## Input

- Scene files — every `entity:` node across planned scenes
- `data-model.yml` — entity definitions, view modes, templates, reference fields

## Output

Present the work list for confirmation:

| Entity | View Mode | Template | Output |
|--------|-----------|----------|--------|
| `node.article` | `full` | `field-map` | `entity-mapping/node.article.full.jsonata` |
| `node.article` | `teaser` | `field-map` | `entity-mapping/node.article.teaser.jsonata` |
| `media.image` | `default` | `field-map` | `entity-mapping/media.image.default.jsonata` |

## Why collect upfront

- Surfaces all dependencies before any file is written
- Deduplicates: same `entity.view_mode` pair may appear in multiple scenes
- Establishes order: leaf entities (no outgoing refs) first, then parents

## Constraints

- Traverse `type: reference` or `type: entityreference` fields recursively — add referenced entities with their implied view_mode
- Verify each template has a matching rule (`skills/*/rules/*.md` with `when: stages: [map-entity], template: {name}`). Stop and report if no rule found
- Confirm with user before proceeding to `map-entity`
