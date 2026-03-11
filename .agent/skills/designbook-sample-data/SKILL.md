---
name: designbook-sample-data
description: Validates and generates sample data files (data.yml). Enforces nested entity_type.bundle format and validates against data-model.yml.
---

# Designbook Sample Data

> Validates and generates `data.yml` files containing sample data for sections. Ensures all entity references exist in `data-model.yml` and field names match the data model schema.

## Prerequisites

1. **Data model**: `$DESIGNBOOK_DIST/data-model.yml` — MUST exist
2. **Section scenes**: `$DESIGNBOOK_DIST/sections/[section-id]/*.section.scenes.yml` — recommended

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


## Validation

Run the CLI validator to check a section's data.yml:

```bash
npx storybook-addon-designbook validate data <section-id>
```

## Validation Rules

### ⛔ Hard Errors (STOP generation)

These MUST be checked before writing the file:

1. **Missing entity type**: Top-level key (e.g. `node`) not in `data-model.yml` → `content.[entity_type]`
   > "❌ Entity type `[entity_type]` does not exist in data-model.yml."

2. **Missing bundle**: Second-level key (e.g. `article`) not in `data-model.yml` → `content.[entity_type].[bundle]`
   > "❌ Bundle `[entity_type].[bundle]` is not defined in data-model.yml. Run `/debo-data-model` to add it first."

### ⚠️ Warnings (continue but report)

4. **Unknown field**: Record contains a field not defined in `data-model.yml` → `content.[entity_type].[bundle].fields.[field_name]`
   > "⚠️ Field `[field_name]` on `[entity_type].[bundle]` is not defined in data-model.yml."

5. **Missing required field**: A field marked `required: true` in data-model.yml is absent from a record
   > "⚠️ Required field `[field_name]` missing on `[entity_type].[bundle]` record id=[id]."

6. **Broken reference**: A reference field value doesn't match any `id` in the target entity's records
   > "⚠️ Reference `[field_name]: [value]` on record id=[id] — target record not found in `[target_entity_type].[target_bundle]`."

### Validation is scoped to the section

Only validate entities and references **within the current data.yml file**. Cross-section references are not checked.

## Content Guidelines

- Create 5–10 records per entity (enough for lists, pagination, empty states)
- Use realistic, varied content — no "Lorem ipsum"
- Include edge cases: long names, empty optional fields, different statuses
- Vary content across records (different lengths, categories, authors)
- Reference fields should form a realistic web of relationships
