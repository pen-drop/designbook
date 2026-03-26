---
files: []
reads:
  - path: $DESIGNBOOK_DIST/data-model.yml
  - path: $DESIGNBOOK_DIST/sections
---

# Intake: Sample Data

Help the user select which section needs sample data. The result feeds the `create-sample-data` stage.

> **Note:** When running `/debo-design-screen`, sample data is generated automatically — no need to run this workflow first. Use `/debo-sample-data` to add or refresh data independently.

## Step 1: Select Section

List all directories under `${DESIGNBOOK_DIST}/sections/`. Present the available sections:

> "Which section should get sample data?
>
> 1. **getting-started**
> 2. **blog**
>
> (Enter number or section id)"

Wait for response. Set `section_id` to the selected section's directory name (e.g. `getting-started`). This value is used in `workflow plan` to expand the `files[]` path `$DESIGNBOOK_DIST/sections/{{ section_id }}/data.yml`.

## Step 2: Analyze Data Needs

Read `data-model.yml`. Enumerate all bundles defined under `content:` and `config:`. These are the candidates for sample data generation — every bundle in the data model needs records.

Present the analysis in two groups:

> **Content entities for [Section Title]:**
> - `node.article` — [brief description from data-model title/description]
> - `taxonomy_term.author` — [brief description]
> - `media.image` — [brief description]
>
> **Config entities:**
> - `view.article_listing` — [brief description]
>
> **Proposed records:**
> - `node.article`: 6 records
> - `taxonomy_term.author`: 3 records
> - `media.image`: 6 records
> - `view.article_listing`: 1 record (with 6 rows)
>
> ⛔ Any entities not yet in data-model.yml? → Run `/debo-data-model` first.

Wait for response. Iterate until approved. Once confirmed, the `create-sample-data` stage runs automatically.
