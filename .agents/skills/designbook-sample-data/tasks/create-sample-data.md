---
params:
  section_id: ~
  entities: []       # optional: list of {entity_type, bundle, view_mode} from collect-entities
  view_configs: []   # optional: list of {bundle, rows_entity_type, rows_bundle, rows_view_mode} for view entities
reads:
  - path: $DESIGNBOOK_DIST/data-model.yml
files:
  - $DESIGNBOOK_DIST/sections/{{ section_id }}/data.yml
---

# Create Sample Data

Writes `$DESIGNBOOK_DIST/sections/{{ section_id }}/data.yml` with realistic sample records. Idempotent: checks existing records and only appends what is missing. Never overwrites existing data.

## Step 1: Read existing data.yml

Read `$DESIGNBOOK_DIST/sections/{{ section_id }}/data.yml` if it exists. Build an inventory:

```
existing_counts[entity_type][bundle] = number of records
```

If the file does not exist, treat all counts as 0.

## Step 2: Determine required record counts

If `entities` is provided (populated by `collect-entities`), use it to determine per-bundle requirements. Otherwise infer from `data-model.yml` based on what the section needs.

For each entity type/bundle:

**View entities** (`entity_type: view`):
- Look up `config.view.<bundle>.items_per_page` from existing data; default **6**
- `required_count = max(items_per_page, 6)`
- Apply `required_count` to the view's target content bundle (the entity type the view lists)

**Non-full view modes** (listing, teaser, card, etc.):
- `required_count = 6`

**Full view mode with layout-builder or canvas template** (`view_modes.full.template: layout-builder|canvas`):
- `required_count = max(existing_count, 3)` — preserve existing, ensure at least 3

**Full view mode with other templates** (e.g. `field-map`):
- `required_count = 1`

## Step 3: Generate view records (if view_configs provided)

For each view in `view_configs`:
- Check if `config.view.<bundle>` already has a record
- If missing → generate a full view record including `rows`

`rows` count = `items_per_page` (default 6). Each row references a record of the target content bundle in round-robin order (record indices 0, 1, 2, …):

```yaml
config:
  view:
    <bundle>:
      - id: "<bundle>"
        items_per_page: 6
        sort_field: title
        sort_direction: asc
        rows:
          - type: entity
            entity_type: <rows_entity_type>
            bundle: <rows_bundle>
            view_mode: <rows_view_mode>
            record: 0
          - type: entity
            entity_type: <rows_entity_type>
            bundle: <rows_bundle>
            view_mode: <rows_view_mode>
            record: 1
          # … repeat up to items_per_page
```

If `rows_entity_type`/`rows_bundle`/`rows_view_mode` are not provided in the `view_configs` entry, omit the `rows` field.

## Step 4: Generate missing records

For each entity type/bundle where `existing_count < required_count`:

- Generate `required_count - existing_count` new records
- **Append only** — do NOT replace existing records
- New record IDs continue from the highest existing numeric ID (or start at "1")
- Use the field value generation rules below

## Field Value Generation

For each field in a record, determine value structure using this precedence:

1. **Explicit `sample_template`** — field has `sample_template.template: <name>` in `data-model.yml`
   → Load rules matching `when: template: <name>`
   → Apply `sample_template.settings.hint` as content context if present

2. **`field_type` rule fallback** — a rule matches `when: field_type: <type>`
   → Load that rule and use its output structure

3. **Plain string** — no template, no matching rule → realistic plain string value

## Content Guidelines

- Realistic, varied content — no lorem ipsum
- Include edge cases: long titles, empty optional fields, different statuses
- Reference fields use IDs of records that exist after this stage
- Field names must match exactly (including `field_` prefix for Drupal)

## Validation

Check against `$DESIGNBOOK_DIST/data-model.yml` before writing:

### ⛔ Hard Errors (stop — fix before writing)

1. **Missing entity type** — top-level key not in `data-model.yml`
   > "❌ Entity type `[entity_type]` does not exist in data-model.yml."

2. **Missing bundle** — second-level key not in `data-model.yml`
   > "❌ Bundle `[entity_type].[bundle]` is not defined in data-model.yml."

### ⚠️ Warnings (continue but report)

3. **Unknown field** — field not defined in `data-model.yml` for this bundle
4. **Missing required field** — `required: true` field absent from a record
5. **Broken reference** — reference field value doesn't match any `id` in the target entity's records

## Output

If data was generated:
> "Generated sample data for `[section_id]`:"
> - `node.article`: 4 new records (had 2, needed 6)

If already sufficient:
> "Sample data for `[section_id]` is up to date — no records generated."
