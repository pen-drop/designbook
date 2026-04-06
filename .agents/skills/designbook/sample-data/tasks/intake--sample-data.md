---
when:
  steps: [sample-data:intake]
files: []
reads:
  - path: $DESIGNBOOK_DATA/data-model.yml
  - path: $DESIGNBOOK_DATA/sections
---

# Intake: Sample Data

Help the user select which section needs sample data. The result feeds the `create-sample-data` stage.

> **Note:** When running `/debo-design-screen`, sample data is generated automatically — no need to run this workflow first. Use `/debo-sample-data` to add or refresh data independently.

## Step 1: Select Section

List all directories under `${DESIGNBOOK_DATA}/sections/`. Present the available sections:

> "Which section should get sample data?
>
> 1. **getting-started**
> 2. **blog**
>
> (Enter number or section id)"

Wait for response. Set `section_id` to the selected section's directory name (e.g. `getting-started`). This value is used in `workflow plan` to expand the `files[]` path `$DESIGNBOOK_DATA/sections/{{ section_id }}/data.yml`.

## Step 2: Analyze Data Needs

Read `data-model.yml`. Enumerate all bundles defined under `content:` and `config:`. These are the candidates for sample data generation — every bundle in the data model needs records.

Present the analysis in two groups:

> **Content entities for [Section Title]:**
> - `[entity_type].[bundle]` — [brief description from data-model title/description]
> - `[entity_type].[bundle]` — [brief description]
>
> **Config entities:**
> - `[listing_type].[bundle]` — [brief description]
>
> **Proposed records:**
> - `[entity_type].[bundle]`: 6 records
> - `[listing_type].[bundle]`: 1 record (with 6 rows)
>
> ⛔ Any entities not yet in data-model.yml? → Run `/debo-data-model` first.

Wait for response. Iterate until approved. Once confirmed, the `create-sample-data` stage runs automatically.
