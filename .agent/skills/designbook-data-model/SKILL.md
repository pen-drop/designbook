---
name: designbook-data-model
description: Validates and stores data model configuration in JSON format.
---

# Designbook Data Model Skill

This skill is the central authority for validating and saving the data model to the project. It validates the data model JSON against the bundled JSON Schema using `ajv-cli` and persists it to `designbook/data-model.json`.

## Schema

The JSON Schema is bundled with this skill at `schema/data-model.json`. This is the single source of truth for validation.

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

## Dependencies

- **ajv-cli** — used via `npx ajv-cli`

## Validation

Validate a data model file against the schema:

```bash
npx ajv-cli validate \
  -s .agent/skills/designbook-data-model/schema/data-model.json \
  -d <path-to-data-model.json>
```

## Steps

- [process-data-model](./steps/process-data-model.md): Validates and saves data model configuration.
