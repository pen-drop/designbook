---
name: designbook-data-model
description: Validates and stores data model configuration in YAML format. Defines entity types, bundles, and field schemas. View mode display mappings are handled separately by the designbook-view-modes skill.
---

# Designbook Data Model Skill

Write and validate `data-model.yml` from an approved data model structure.

## Steps

Write the approved data model to `${DESIGNBOOK_DIST}/data-model.yml` in YAML format.

---

## Schema Reference

The schema is bundled in the addon package.

### Structure

```
content (required)
  └── {entity_type}          # e.g. node, block_content, media, taxonomy_term
        └── {bundle}          # e.g. article, landing_page
              ├── title
              ├── description
              ├── composition  # optional: "structured" (default) | "unstructured"
              └── fields
                    └── {field_name}
                          ├── type (required)  # string, text, integer, boolean, reference, ...
                          ├── title
                          ├── description
                          ├── required
                          ├── multiple
                          ├── default
                          └── settings

config (optional)
  └── list
        └── {list_name}
              ├── sources (required, array, minItems: 1)
              │     └── { entity_type, bundle, view_mode }
              ├── limit
              └── sorting
```

### `composition`

Only affects `view_mode: full`:
- `structured` (default) — all view modes render from fields
- `unstructured` — full view mode uses a layout/component tree; other view modes still use fields

### List Config

Lists declare collections from one or more entity/bundle/view_mode sources:

```yaml
config:
  list:
    recent_articles:
      sources:
        - entity_type: node
          bundle: article
          view_mode: teaser
      limit: 10
      sorting: created
```

> The list wrapper layout (grid, pager, etc.) is defined in a separate `.jsonata` file — see `designbook-view-modes`.
