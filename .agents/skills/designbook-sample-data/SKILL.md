---
name: designbook-sample-data
description: Validates and generates sample data files (data.yml). Enforces nested entity_type.bundle format and validates against data-model.yml.
---

# Designbook Sample Data

Validates and generates `data.yml` files containing sample data for sections. Ensures all entity references exist in `data-model.yml` and field names match the data model schema.

## Output

```
$DESIGNBOOK_DIST/sections/[section-id]/data.yml
```

## Task Files

- [create-sample-data.md](tasks/create-sample-data.md) — Generate `data.yml` with sample records for a section

## Resources

- [format.md](resources/format.md) — Nested entity_type.bundle structure, record rules, field templates, content guidelines
