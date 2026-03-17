---
name: /debo-sample-data
id: debo-sample-data
category: Designbook
description: Create sample data and type definitions for a section
---

Create realistic sample data for a section. Output: `${DESIGNBOOK_DIST}/sections/[section-id]/data.yml`.

> ⛔ **MANDATORY**: Read `@designbook-sample-data/SKILL.md` before generating any data. It defines the nested format, validation rules, and content guidelines.

> **Spec Mode (`--spec`):** If the user passes `--spec`, do NOT create or modify any files. Instead, output a structured YAML plan showing what WOULD be created — file paths and content summaries.

**Steps**

## Step 1: Check Prerequisites

Check if these files exist:
- `${DESIGNBOOK_DIST}/data-model.yml` — data model (required)
- At least one `${DESIGNBOOK_DIST}/sections/*/*.section.scenes.yml` — sections (required)

**If missing**, tell the user which prerequisite workflows to run (`/debo-data-model`, `/debo-sections`) and stop.

## Step 2: Select Section

If the user provided a section name as argument, use it directly.

Otherwise, scan `${DESIGNBOOK_DIST}/sections/*/*.section.scenes.yml` to discover available sections. For each section, check if `data.yml` already exists.

Present sections with status indicators:

> 1. **[Section 1]** — ✓ Spec / ✓ Data
> 2. **[Section 2]** — ✓ Spec / ○ No data

If data already exists, ask: update or start fresh?

Wait for response.

## Step 3: Analyze Data Needs

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

## Step 4: Generate and Present Data

Generate sample data following the rules from `@designbook-sample-data/SKILL.md`. Present a summary:

> **[Entity 1]** ([N] records): [brief record summaries]
> **[Entity 2]** ([N] records): [brief record summaries]
>
> Shall I save this?

Iterate until the user approves.

## Step 5: Validate and Save

Before writing the file:

1. Run validation checks from `@designbook-sample-data/SKILL.md` (entity_type.bundle existence, field matching)
2. Report any warnings
3. Write to `${DESIGNBOOK_DIST}/sections/[section-id]/data.yml`

## Step 6: Confirm

> Saved `${DESIGNBOOK_DIST}/sections/[section-id]/data.yml`.
>
> - [N] entity types, [N] total records
>
> Next: `/debo-design-screen [section-id]` for screen designs.

## Workflow Tracking

Load `@designbook-workflow/steps/create.md`:
- `--workflow debo-sample-data` / `--title "Create Sample Data"` / `--task "create-sample-data:Create sample data:data"`

If `--spec`: output the plan and stop here.

For task `create-sample-data`:
1. Load `@designbook-workflow/steps/update.md` → mark **in-progress**
2. Do the work
3. Load `@designbook-workflow/steps/add-files.md` → `--files data.yml`
4. Load `@designbook-workflow/steps/validate.md` → fix loop until exit 0
5. Load `@designbook-workflow/steps/update.md` → mark **done**
