---
name: /debo-sections
id: debo-sections
category: Designbook
description: Define your sections based on the product vision
---

Help the user create or update their product sections for Designbook. The sections break the product vision into 3–5 development areas. The result is saved to `${DESIGNBOOK_DIST}/sections/[id]/[id].section.scenes.yml`.

> **Spec Mode (`--spec`):** If the user passes `--spec`, do NOT create or modify any files. Instead, output a structured YAML plan showing what WOULD be created — file paths and content summaries. This enables testing without side effects.
**Steps**

## Step 1: Check Current State

First, check if the following files exist:
- `${DESIGNBOOK_DIST}/product/vision.md` — the product vision
- `${DESIGNBOOK_DIST}/sections/*/*.section.scenes.yml` — existing sections

**If no product vision exists**, tell the user:

> "I don't see a product vision yet. The sections build on your product vision — please run `/debo-vision` first to define what you're building, then come back to `/sections`."

Stop here.

**If sections already exist**, read both files and present the current state:

> "I see you already have [N] sections:
>
> 1. **[Section 1]** — [Description]
> 2. **[Section 2]** — [Description]
>
> Would you like to:
> - **Update** — Add, remove, or reorder sections
> - **Start fresh** — Regenerate based on the current product vision"

Then proceed to Step 2 or re-enter the full flow based on their choice.

**If only product vision exists**, read it and proceed to Step 2.

## Step 2: Analyze and Propose Sections

Read `${DESIGNBOOK_DIST}/product/vision.md` and analyze:
- The product name and core description
- The problems being solved
- The key features listed

Based on this analysis, propose 3–5 sections that represent:
- **Main areas** of the product
- **Logical build order** — what to build first, what depends on what
- **Self-contained feature areas** — each can be designed and built independently

Present the proposal:

> "Based on your product vision for **[Product Name]**, I'd suggest breaking this into these development sections:
>
> 1. **[Section Title]** — [One sentence description]
> 2. **[Section Title]** — [One sentence description]
> 3. **[Section Title]** — [One sentence description]
>
> These are ordered by development priority. The first section covers the core functionality, with each subsequent section building on it.
>
> Does this breakdown make sense? Would you like to adjust any sections or their order?"

## Step 3: Refine with User

Iterate on the sections based on user feedback. Ask clarifying questions as needed.

Keep iterating until the user approves the sections.

## Step 4: Save the Files

Once the user approves, create individual YAML files for each section under `${DESIGNBOOK_DIST}/sections/[id]/`.

For each section, create a file named `${DESIGNBOOK_DIST}/sections/[id]/[id].section.scenes.yml` with this format:

```yaml
id: section-id-kebab-case
title: Section Title
description: One sentence description
status: planned
order: 1

name: "Designbook/Sections/Section Title"
layout: "shell"

scenes: []
```

**Important:**
- `id` must be kebab-case and unique
- The directory name must match the `id` (e.g., `sections/unified-dashboard/unified-dashboard.section.scenes.yml`)
- `status` defaults to "planned"
- `order` should reflect the sequence (1, 2, 3...)
- `name` follows the `"Designbook/Sections/[Title]"` convention
- `layout: "shell"` enables layout inheritance from the shell
- `scenes` starts as empty array — populated later by `/debo-design-screen`

Create the directory `${DESIGNBOOK_DIST}/sections/[id]/` for each section if it doesn't exist.

## Step 5: Confirm Completion

Let the user know:

> "I've saved your product sections to `${DESIGNBOOK_DIST}/sections/`. Open Storybook to see the [N] development sections displayed below your product vision on the Product page.
>
> Your sections:
> 1. **[Section 1]** — [Description]
> 2. **[Section 2]** — [Description]
> 3. **[Section 3]** — [Description]
>
> **Next step:** You can now use these sections to plan your design and development work."

**Guardrails**
- Always read the product vision first — the sections must align with it
- If no product vision exists, redirect to `/debo-vision` and stop
- Be conversational and help the user think through the breakdown
- Keep sections self-contained — each should be designable and buildable independently
- 3–5 sections is the sweet spot — push back gently if the user wants too many or too few

## Workflow Tracking

Load `@designbook-workflow/SKILL.md`.

At workflow start, create the tracking file:
```
WORKFLOW_NAME=$(node packages/storybook-addon-designbook/dist/cli.js workflow create --workflow debo-sections --title "Define Sections" --task "create-sections:Create section files:data")
```

If `--spec`: output the plan and stop here.

After completing each step, update:
```
node packages/storybook-addon-designbook/dist/cli.js workflow update $WORKFLOW_NAME create-sections --status done
```
