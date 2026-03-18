---
name: designbook-sample-data
description: Validates and generates sample data files (data.yml). Enforces nested entity_type.bundle format and validates against data-model.yml.
---

# Designbook Sample Data

> Validates and generates `data.yml` files containing sample data for sections. Ensures all entity references exist in `data-model.yml` and field names match the data model schema.

## Task Files

- [create-sample-data.md](tasks/create-sample-data.md) — Generate `data.yml` with sample records for a section

## Output

```
$DESIGNBOOK_DIST/sections/[section-id]/data.yml
```

## Format: Nested entity_type.bundle

Sample data uses a **nested structure** that mirrors `data-model.yml`:

```yaml
taxonomy_term:
  author:
    - id: "1"
      title: Dr. Lena Hartmann
      field_role: Tierärztin

node:
  article:
    - id: "1"
      title: Article Title
      field_author: "1"
```

### Structure Rules

| Level | Key | Maps to |
|-------|-----|---------|
| 1 | `node`, `taxonomy_term`, `block_content`, `media` | Entity type from `data-model.yml` → `content.[entity_type]` |
| 2 | `article`, `author`, `pet` | Bundle from `data-model.yml` → `content.[entity_type].[bundle]` |
| 3 | Array of records | Individual entity instances |

### Record Rules

- `id` — required, simple string (`"1"`, `"2"`, etc.)
- `title` — required for most entities
- Field names use `field_*` prefix (matching data-model.yml)
- Reference fields store the target entity's `id` value

## Content Guidelines

- Create 5–10 records per entity (enough for lists, pagination, empty states)
- Use realistic, varied content — no "Lorem ipsum"
- Include edge cases: long names, empty optional fields, different statuses
- Vary content across records (different lengths, categories, authors)
- Reference fields should form a realistic web of relationships
