---
name: designbook-sample-data
description: Validates and generates sample data files (data.yml). Reads data-model.yml to generate both content and config entities using a unified two-pass loop. All differences between entity types are handled via field types and sample_template rules.
---

# Designbook Sample Data

Generates `data.yml` files containing realistic sample records for sections. Reads all entity types and bundles from `data-model.yml` — both `content:` and `config:` — and generates records for each. Content entities are generated first (Pass 1), then config entities (Pass 2), so that config templates (e.g. `views`) can reference content record indices.

## Output

```
$DESIGNBOOK_DIST/sections/[section-id]/data.yml
```

## Task Files

- [intake.md](tasks/intake.md) — Select section and present entity list from data-model.yml for confirmation
- [create-sample-data.md](tasks/create-sample-data.md) — Generate `data.yml` with sample records for all content and config entities

## Resources

- [format.md](resources/format.md) — File structure, content/config buckets, entity reference formats, field templates
