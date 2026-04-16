---
when:
  steps: [create-sample-data]
domain: [sample-data]
params:
  type: object
  required: [section_id, data_model, components_dir]
  properties:
    section_id: { type: string }
    entities: { type: array, default: [] }
    data_model:
      path: $DESIGNBOOK_DATA/data-model.yml
      workflow: /debo-data-model
      type: object
    sections_dir:
      path: $DESIGNBOOK_DATA/sections/
      type: string
    components_dir:
      path: $DESIGNBOOK_DIRS_COMPONENTS
      type: string
      description: Available components — required for canvas bundle generation (rule canvas.md)
result:
  type: object
  required: [sample-data]
  properties:
    sample-data:
      path: $DESIGNBOOK_DATA/sections/{{ section_id }}/data.yml
      type: object
      validators: [data]
---

# Sample Data

Generate sample data for a section. Idempotent — reads existing data.yml, preserves records, appends missing.

## Gathering

### Select Section

If `section_id` is not provided, list all directories under the sections directory. Present the available sections:

> "Which section should get sample data?
>
> 1. **getting-started**
> 2. **blog**
>
> (Enter number or section id)"

Wait for response. Set `section_id` to the selected section's directory name.

### Analyze Data Needs

Analyze the data model. Enumerate all bundles defined under `content:` and `config:`. Present the analysis:

> **Content entities for [Section Title]:**
> - `[entity_type].[bundle]` — [brief description]
>
> **Config entities:**
> - `[listing_type].[bundle]` — [brief description]
>
> **Proposed records:**
> - `[entity_type].[bundle]`: 6 records
>
> Any entities not yet in the data model? → Run `/debo data-model` first.

Wait for response. Iterate until approved.

## Generation

### Step 1: Read existing data.yml

Read `$DESIGNBOOK_DATA/sections/{{ section_id }}/data.yml` if it exists. Build an inventory:

```
existing_counts[entity_type][bundle] = number of records
```

If the file does not exist, treat all counts as 0.

### Step 2: Determine required record counts

If `entities` is provided (populated by `plan-entities`), use it to determine per-bundle requirements. Otherwise read all bundles from the data model (`content:` and `config:` sections).

**Skip rule — `purpose: landing-page` bundles:**
If a bundle declares `purpose: landing-page` in the data model AND `entities` is provided AND that bundle is NOT present in the `entities` list → skip it entirely.

For each entity type/bundle (after applying the skip rule):

**Non-full view modes** (listing, teaser, card, etc.):
- `required_count = 6`

**Full view mode with layout-builder or canvas template** (`view_modes.full.template: layout-builder|canvas`):
- `required_count = max(existing_count, 3)` — preserve existing, ensure at least 3

**Full view mode with other templates** (e.g. `field-map`):
- `required_count = 1`

**Config entities** (anything under `config:`):
- `required_count = 1` unless the bundle already has records

### Step 3: Generate — Pass 1 (content entities)

Iterate all bundles from the data model under `content:`.

For each bundle where `existing_count < required_count`:
- Generate `required_count - existing_count` new records
- **Append only** — do NOT replace existing records
- New record IDs continue from the highest existing ID (or start at "1")
- Use the field value generation rules below

### Step 4: Generate — Pass 2 (config entities)

Iterate all bundles from the data model under `config:`.

For each bundle where `existing_count < required_count`:
- Generate records using the same field value generation rules

## Output Format

`data.yml` MUST use `content:` and `config:` as top-level section keys — mirroring the data model structure:

```yaml
content:
  {entity_type}:       # e.g. node, media, taxonomy_term, canvas_page
    {bundle}:          # e.g. article, image, tags, landing_page
      - id: "1"
        {field}: {value}

config:
  {entity_type}:       # e.g. view
    {bundle}:
      - id: "1"
        {field}: {value}
```

- Content entities from the data model `content:` section → write under `content:` in `data.yml`
- Config entities from the data model `config:` section → write under `config:` in `data.yml`
- Omit `config:` entirely if there are no config entities

## Field Value Generation

For each field in a record, determine value structure using this precedence:

1. **Explicit `sample_template`** — field has `sample_template.template: <name>` in the data model
   → Load rules matching `when: template: <name>`
   → Apply `sample_template.settings` as context

2. **`field_type` rule fallback** — a rule matches `when: field_type: <type>`
   → Load that rule and use its output structure

3. **Plain string** — no template, no matching rule → realistic plain string value

### Entity reference fields (content entities)

Reference fields (`type: reference`) on `content:` entities store the target record's `id` as a **plain string**:

```yaml
shelter: shelter-1
category: cat-dogs
```

### Entity reference fields on config listing entities (rows)

Config listing bundles that aggregate content use the **object form**:

```yaml
rows:
  - type: entity
    entity_type: post
    bundle: article
    view_mode: teaser
    record: 0
```

## Validation

Check against the data model before writing:

### Hard Errors (stop — fix before writing)

1. **Missing entity type** — top-level key not in the data model
2. **Missing bundle** — second-level key not in the data model

### Warnings (continue but report)

1. **Unknown field** — field not defined in the data model for this bundle
2. **Missing required field** — `required: true` field absent from a record
3. **Broken reference** — reference field value doesn't match any `id` in the target bundle's records
