---
stage: collect-entities
reads:
  - path: $DESIGNBOOK_DIST/data-model.yml
    workflow: debo-data-model
  - path: $DESIGNBOOK_DIST/sections/[section-id]/[section-id].section.scenes.yml
    workflow: debo-shape-section
---

# Collect Entities

Builds the complete entity work list before any JSONata files are written. Run this once per section, after UI components are confirmed and before `map-entity`/`compose-entity`.

## Why

Scenes reference entities, entities reference other entities (recursively via reference fields or layout builder). Collecting upfront:
- Surfaces all dependencies before any file is written
- Deduplicates: the same `entity.view_mode` pair may appear in multiple scenes
- Establishes generation order: leaf entities (no outgoing refs) first, then their parents

## Process

1. **Start from the scenes plan** — list every `entity:` node across all planned scenes, noting `entity_type.bundle` and `view_mode`
2. **Look up each entity in `data-model.yml`** — find its `composition` and `fields`
3. **Apply routing** to each entry and determine the output granularity:

   | Condition | Stage | Granularity |
   |-----------|-------|-------------|
   | `entity_type: view` | `compose-entity` | 1 file per `(view_name, view_mode)` — generic |
   | `view_mode != full` | `map-entity` | 1 file per `(entity_type, bundle, view_mode)` — generic |
   | `view_mode = full`, `composition: structured` | `map-entity` | 1 file per `(entity_type, bundle, view_mode)` — generic |
   | `view_mode = full`, `composition: unstructured` | `compose-entity` | **1 composition per record** — instance-specific |

   Unstructured entities require a separate composition for each record because Layout Builder / Canvas stores the component tree per entity instance, not as a shared template.

4. **Traverse reference fields** for every `map-entity` entry — each `type: reference` field points to another `entity_type.bundle`. Add the referenced entity with its implied view_mode (default: `default`) to the list unless already present. Repeat recursively until no new entries are added.

5. **For unstructured entities**, look up how many records appear in `data.yml` for that bundle. Each record gets its own row.

## Output

Present the work list as a table before proceeding:

| Entity | Record | View Mode | Stage | Output |
|--------|--------|-----------|-------|--------|
| `node.article` | — | `full` | `map-entity` | `view-modes/node.article.full.jsonata` |
| `node.article` | — | `teaser` | `map-entity` | `view-modes/node.article.teaser.jsonata` |
| `media.image` | — | `default` | `map-entity` | `view-modes/media.image.default.jsonata` |
| `view.recent_articles` | — | `default` | `compose-entity` | `view-modes/view.recent_articles.default.jsonata` |
| `node.landing_page` | 0 | `full` | `compose-entity` | inline `components:` in scenes.yml |
| `node.landing_page` | 1 | `full` | `compose-entity` | inline `components:` in scenes.yml |

Generic entries (map-entity, view entities) show `—` in the Record column. Unstructured content entries show the record index from `data.yml`.

Confirm with the user if anything looks unexpected. Then proceed to `map-entity` for all `map-entity` rows, followed by `compose-entity` for all `compose-entity` rows.
