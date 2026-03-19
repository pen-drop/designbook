---
stage: ensure-sample-data
params:
  section_id: ~
  entities: []       # list of {entity_type, bundle, view_mode} from collect-entities
  view_configs: []   # list of {bundle, target_entity_type, target_bundle} for view entities
reads:
  - path: $DESIGNBOOK_DIST/data-model.yml
files:
  - $DESIGNBOOK_DIST/sections/{{ section_id }}/data.yml
---

# Ensure Sample Data

Checks existing sample data and generates only what is missing. Runs after `collect-entities` and before `map-entity`/`compose-entity`.

This stage makes `debo-design-screen` self-sufficient: it guarantees data exists for every entity that will be rendered, at the right quantity.

## Process

### Step 1: Read existing data.yml

Read `$DESIGNBOOK_DIST/sections/{{ section_id }}/data.yml` if it exists. Build an inventory:

```
existing_counts[entity_type][bundle] = number of records
```

If the file does not exist, treat all counts as 0.

### Step 2: Determine required record counts

For each entry in `entities`:

**View entities** (`entity_type: view`):

1. Look up or default `config.view.<bundle>.items_per_page`:
   - If `config.view.<bundle>` has a record with `items_per_page` → use that value
   - Otherwise → default to **6**
2. `required_count = max(items_per_page, 6)`
3. Apply `required_count` to the view's `target_bundle` (the content entity the view lists)

**Non-view listing entities** (`view_mode` is not `full`):

- `required_count = 6`

**Detail/full entities** (`view_mode: full`, `composition: structured`):

- `required_count = 1`

**Unstructured entities** (`composition: unstructured`):

- `required_count = max(existing_count, 3)` — preserve existing, ensure at least 3

### Step 3: Generate view config records

For each view entity in `view_configs`:

1. Check if `config.view.<bundle>` already has a record in `data.yml`
2. If missing or `items_per_page` is absent/zero → generate:

```yaml
config:
  view:
    <bundle>:
      - id: "<bundle>"
        items_per_page: 6
        sort_field: title
        sort_direction: asc
```

Use `items_per_page: 6` as default unless context from the section spec or design intent suggests a different count (e.g. a 3-column grid → 6, a hero slider → 3).

### Step 4: Generate missing content records

For each entity type/bundle where `existing_count < required_count`:

- Generate `required_count - existing_count` new records
- Append them to the existing array (do NOT replace existing records)
- New record IDs continue from the highest existing numeric ID (or start at 1)
- Follow the same content guidelines as `create-sample-data`: realistic names, varied content, reference fields populated

### Step 5: Write data.yml

Merge generated records into the existing file structure (or create new file) and write `$DESIGNBOOK_DIST/sections/{{ section_id }}/data.yml`.

If nothing was generated (all counts sufficient), skip writing.

## Rules

- **Never overwrite existing records** — only append
- **IDs are simple strings** — continue from highest existing (`"1"`, `"2"`, etc.)
- **Reference fields** — use IDs of records that exist after this stage (may reference newly generated records)
- **Realistic content** — no lorem ipsum; varied titles, realistic field values
- **Validate against data-model.yml** before writing (same rules as `create-sample-data`)

## Output

If any data was generated, report:

> "Generated sample data for `[section_id]`:"
> - `config.view.docs_list`: 1 record (items_per_page: 6)
> - `node.docs_page`: 4 new records (had 2, needed 6)

If data was already sufficient:

> "Sample data for `[section_id]` is up to date — no records generated."
