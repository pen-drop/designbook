---
stage: compose-entity
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

# Compose Entity

Directly composes the component tree for an entity — no field mapping. Used when the entity has no fields to derive components from.

**Use this task when:**
- `entity_type: view` (view entities — any view_mode)
- `view_mode = full` AND `composition: unstructured`

For all other cases, use `map-entity` instead.

## Routing

Check the entity type and composition, then follow the matching rule:

| Case | Rule that applies |
|------|-------------------|
| `entity_type: view` | `compose-view-entity` rule |
| `composition: unstructured`, `view_mode: full`, `extensions: [layout_builder]` | `compose-layout-builder` rule (Drupal) |
| `composition: unstructured`, `view_mode: full`, `extensions: [canvas]` | `compose-canvas` rule (Drupal) |

Extension-specific rules are provided by `designbook-scenes-drupal` when `DESIGNBOOK_BACKEND=drupal`.

## Output

Output granularity differs by case — composition is **not** always one file per entity type:

| Case | Granularity | Output |
|------|-------------|--------|
| View entity | 1 file per `(view_name, view_mode)` | `entity-mapping/view.{{ bundle }}.{{ view_mode }}.jsonata` |
| Unstructured content (`composition: unstructured`) | **1 per record** — instance-specific | inline `components:` on the entity node in `scenes.yml` |

Unstructured content entities (Layout Builder, Canvas) have a unique component tree per entity instance — there is no shared template. Each record from `data.yml` gets its own `components:` array directly inside the scene.
