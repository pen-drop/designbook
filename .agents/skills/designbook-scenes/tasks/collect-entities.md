---
stage: collect-entities
reads:
  - path: $DESIGNBOOK_DIST/data-model.yml
    workflow: debo-data-model
  - path: $DESIGNBOOK_DIST/sections/[section-id]/[section-id].section.scenes.yml
    workflow: debo-shape-section
---

# Collect Entities

Builds the complete entity work list before any JSONata files are written. Run this once per section, after UI components are confirmed and before `map-entity`.

## Why

Scenes reference entities, entities reference other entities (recursively via reference fields). Collecting upfront:
- Surfaces all dependencies before any file is written
- Deduplicates: the same `entity.view_mode` pair may appear in multiple scenes
- Establishes generation order: leaf entities (no outgoing refs) first, then their parents

## Process

1. **Start from the scenes plan** — list every `entity:` node across all planned scenes, noting `entity_type.bundle` and `view_mode`
2. **Look up each entity in `data-model.yml`** — find its `view_modes.{view_mode}.template` and `settings`
3. **Check template registration** — for each template, verify a matching rule exists (`skills/*/rules/*.md` with `when: stages: [map-entity], template: {name}`). If any template has no matching rule, stop and report: `❌ No rule found for template: {template}. Check entity_mapping.templates in designbook.config.yml.`
4. **Traverse reference fields** — each `type: reference` field points to another `entity_type.bundle`. Add the referenced entity with its implied view_mode (default: `default`) to the list unless already present. Repeat recursively until no new entries are added.

## Output

Present the work list as a table before proceeding:

| Entity | View Mode | Template | Output |
|--------|-----------|----------|--------|
| `node.article` | `full` | `layout-builder` | `entity-mapping/node.article.full.jsonata` |
| `node.article` | `teaser` | `field-map` | `entity-mapping/node.article.teaser.jsonata` |
| `media.image` | `default` | `field-map` | `entity-mapping/media.image.default.jsonata` |
| `view.recent_articles` | `default` | `view-entity` | `entity-mapping/view.recent_articles.default.jsonata` |

Confirm with the user if anything looks unexpected. Then proceed to `map-entity` for all rows in order.
