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

> **Spec Mode (`--spec`):** If the user passes `--spec`, do NOT create or modify any files. Instead, output a structured YAML plan showing what WOULD be created — file paths and content summaries.

**Steps**

## Step 0: Load Workflow Tracking

Load the `designbook-workflow` skill via the Skill tool.

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
