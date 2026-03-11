---
name: designbook-data-model
description: Validates and stores data model configuration in YAML format. Defines entity types, bundles, and field schemas. View mode display mappings are handled separately by the designbook-view-modes skill.
---

# Designbook Data Model Skill

This skill is the central authority for validating and saving the data model to the project. It validates the data model YAML against the bundled schema using `ajv-cli` and persists it to `designbook/data-model.yml`.

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
  └── views
        └── {view_name}
              ├── base_entity (required)
              ├── bundle (required)
              ├── sorting
              ├── limit
              ├── hasPager
              └── hint
```

## Validation

Validate a data model file against the schema:

```bash
npx storybook-addon-designbook validate data-model
```

## Steps

- [process-data-model](./steps/process-data-model.md): Validates and saves data model configuration.
