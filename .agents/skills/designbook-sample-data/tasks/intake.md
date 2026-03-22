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

List all directories under `${DESIGNBOOK_DIST}/sections/`. For each, check if a `*.section.scenes.yml` exists. Present only sections that have a scenes file:

> "Which section should get sample data?
>
> 1. **getting-started** — ✓ Scenes
> 2. **blog** — ✓ Scenes
>
> (Enter number or section id)"

Wait for response. Set `section_id` to the selected section's directory name (e.g. `getting-started`). This value is used in `workflow plan` to expand the `files[]` path `$DESIGNBOOK_DIST/sections/{{ section_id }}/data.yml`.

## Step 2: Analyze Data Needs

Read the section's `*.section.scenes.yml` and `data-model.yml`. Identify which `entity_type.bundle` entries are relevant for this section.

Present the analysis:

> **Entities needed for [Section Title]:**
> - `node.article` — [why needed, based on section spec]
> - `taxonomy_term.author` — [why needed]
>
> **Proposed records:**
> - `node.article`: [N] records
> - `taxonomy_term.author`: [N] records
>
> ⛔ Any entities not yet in data-model.yml? → Run `/debo-data-model` first.

Wait for response. Iterate until approved. Once confirmed, the `create-sample-data` stage runs automatically.
