---
name: /debo-sample-data
id: debo-sample-data
category: Designbook
description: Create sample data and type definitions for a section
workflow:
  title: Create Sample Data
  stages: [dialog, create-sample-data]
reads:
  - path: ${DESIGNBOOK_DIST}/data-model.yml
    workflow: /debo-data-model
  - path: ${DESIGNBOOK_DIST}/sections/*/*.section.scenes.yml
---

Create realistic sample data for a section. Output: `${DESIGNBOOK_DIST}/sections/[section-id]/data.yml`.

> **Note:** When running `/debo-design-screen`, sample data is generated automatically by the `ensure-sample-data` stage — no need to run this workflow first. Use `/debo-sample-data` to add or refresh data independently, or to generate data before a design workflow runs.

> **Spec Mode (`--spec`):** If the user passes `--spec`, do NOT create or modify any files. Instead, output a structured YAML plan showing what WOULD be created — file paths and content summaries.

**Steps**

## Step 0: Load Workflow Tracking

Load the `designbook-workflow` skill via the Skill tool.

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

Read the section's `*.section.scenes.yml` and `data-model.yml`. Identify which `entity_type.bundle` entries from the data model are relevant for this section.

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

Wait for response.

Iterate until the user approves. Once confirmed, the `create-sample-data` stage runs automatically.
