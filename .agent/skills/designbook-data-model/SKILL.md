---
name: designbook-data-model
description: Validates and stores data model configuration in YAML format. Defines entity types, bundles, and field schemas. View mode display mappings are handled separately by the designbook-view-modes skill.
---

# Designbook Data Model Skill

This skill is the central authority for validating and saving the data model to the project. It validates the data model YAML against the bundled schema and persists it to `designbook/data-model.yml`.

> [!IMPORTANT]
> **View mode mappings are no longer part of the data model.**
> They have been moved to separate `.jsonata` files in `view-modes/`. See the `designbook-view-modes` skill for details.

## Schema

The schema is bundled in the addon package.

### Schema structure

```
content (required)
  └── {entity_type}          # e.g. node, block_content, media, taxonomy
        └── {bundle}          # e.g. article, page
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
```

> [!IMPORTANT]
> **`composition` only affects view_mode `full`.**
> - `structured` (default): All view modes render from fields. JSONata may output `type: "entity"` for reference fields.
> - `unstructured`: view_mode `full` uses a layout/component tree (determined by project `extensions` in config). All other view modes (teaser, card, etc.) are always structured and use the bundle's fields.
> Unstructured bundles still need field definitions for their non-full view modes.

config (optional)
  └── list
        └── {list_name}
              ├── sources (required, array, minItems: 1)
              │     └── each source:
              │           ├── entity_type (required)
              │           ├── bundle (required)
              │           └── view_mode (required)
              ├── limit                    # optional integer
              └── sorting                  # optional string (declarative hint)
```

### List Config

Lists declare collections of content from one or more sources. Each source specifies which entity type, bundle, and view mode to use for rendering items.

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

    search:
      sources:
        - entity_type: node
          bundle: article
          view_mode: search_result
        - entity_type: node
          bundle: event
          view_mode: search_result
        - entity_type: media
          bundle: document
          view_mode: search_result
      limit: 20
```

The list wrapper layout (which components to use for the view container, grid, pager, etc.) is defined in a separate JSONata file — see the `designbook-view-modes` skill.

## Steps

- [process-data-model](./steps/process-data-model.md): Validates and saves data model configuration.
- [validate](./steps/validate.md): Validates `data-model.yml` against the schema; fix loop until exit 0.

## Workflow Tracking

> ⛔ **Use `@designbook-workflow/steps/`** for tracking: load `create` → `update` (in-progress) → `add-files` → `validate` → `update` (done).

Produced file for `--files`: `data-model.yml`
