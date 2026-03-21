---
name: designbook-data-model
description: Validates and stores data model configuration in YAML format. Defines entity types, bundles, and field schemas.
---

# Designbook Data Model Skill

Write and validate `data-model.yml` from an approved data model structure.

## Steps

Write the approved data model to `${DESIGNBOOK_DIST}/data-model.yml` in YAML format.

## Task Files

- [create-data-model.md](tasks/create-data-model.md) — Create the data-model.yml file

## Rules

- [sample-template-mapping.md](rules/sample-template-mapping.md) — Auto-assign `sample_template` from `sample_data.field_types` config during dialog/creation

## Resources

- [schema-reference.md](resources/schema-reference.md) — Full schema structure, `view_modes`, `sample_template`, view config
