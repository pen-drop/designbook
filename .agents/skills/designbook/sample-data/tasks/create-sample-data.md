---
trigger:
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
- Apply field value generation, output format, idempotent-append, and validation constraints from the `field-values` rule

### Step 4: Generate — Pass 2 (config entities)

Iterate all bundles from the data model under `config:`.

For each bundle where `existing_count < required_count`:
- Generate records using the same field value generation constraints from the `field-values` rule
