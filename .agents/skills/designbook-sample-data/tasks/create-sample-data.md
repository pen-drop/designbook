---
params:
  section_id: ~
  entities: []
reads:
  - path: $DESIGNBOOK_DIST/data-model.yml
files:
  - $DESIGNBOOK_DIST/sections/{{ section_id }}/data.yml
---

# Create Sample Data

Writes `$DESIGNBOOK_DIST/sections/{{ section_id }}/data.yml` with realistic sample records for all entity types needed by the section.

## Output

```
$DESIGNBOOK_DIST/sections/{{ section_id }}/data.yml
```

## Format

Nested by `entity_type.bundle`, then an array of records:

```yaml
node:
  article:
    - title: "Example Article Title"
      field_body: "Body text content..."
      field_tags:
        - name: "Technology"
  landing_page:
    - title: "Welcome"

taxonomy_term:
  tags:
    - name: "Technology"
    - name: "Design"
```

## Rules

- Every entity type/bundle in the section's scenes file must have records
- Records must match the fields defined in `data-model.yml`
- Field names must match exactly (including `field_` prefix for Drupal)
- Use realistic but fictional content — no lorem ipsum for titles or labels
- Reference fields use nested objects with the referenced entity's fields
- Minimum 3 records for listing view modes; 1 for detail/full view modes

## Validation

Run before writing the file. Check against `$DESIGNBOOK_DIST/data-model.yml`.

### ⛔ Hard Errors (stop — fix before writing)

1. **Missing entity type**: Top-level key not in `data-model.yml` → `content.[entity_type]`
   > "❌ Entity type `[entity_type]` does not exist in data-model.yml."

2. **Missing bundle**: Second-level key not in `data-model.yml` → `content.[entity_type].[bundle]`
   > "❌ Bundle `[entity_type].[bundle]` is not defined in data-model.yml."

### ⚠️ Warnings (continue but report)

3. **Unknown field**: Field not defined in `data-model.yml` for this bundle
   > "⚠️ Field `[field_name]` on `[entity_type].[bundle]` is not defined in data-model.yml."

4. **Missing required field**: Field marked `required: true` absent from a record
   > "⚠️ Required field `[field_name]` missing on `[entity_type].[bundle]` record id=[id]."

5. **Broken reference**: Reference field value doesn't match any `id` in the target entity's records
   > "⚠️ Reference `[field_name]: [value]` on record id=[id] — target not found in `[target_entity_type].[target_bundle]`."

Only validate entities and references within the current `data.yml` file. Cross-section references are not checked.
