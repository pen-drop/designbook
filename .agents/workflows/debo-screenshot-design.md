---
name: /debo-screenshot-design
id: debo-screenshot-design
category: Designbook
description: Capture screenshots of screen designs for documentation
workflow:
  title: Capture Screenshots
  stages: [dialog, capture-screenshots]
---

Help the user capture and document screenshots for a section's screen designs. Screenshots are documented in `designbook/sections/[section-id]/screenshots.md`.

**Steps**

## Step 0: Load Workflow Tracking

Load the `designbook-workflow` skill via the Skill tool.

## Step 1: Check Prerequisites

Check if the following files exist for the target section:
- `designbook/sections/[section-id]/*.section.scenes.yml` — section spec (required)
- `designbook/sections/[section-id]/overview.section.yml` — overview with screen designs (required)

**If screen designs are missing**, tell the user:

> "Before capturing screenshots, you need screen designs defined. Please run `/design-screen` first."

Stop here.

## Step 2: Select Section and Screen Design

Parse the roadmap and identify sections that have screen designs. Present them:

> "Sections with screen designs:
>
> 1. **[Section 1]** — [N] screen designs
>    - [ViewName1]
>    - [ViewName2]
>
> Which section and view would you like to screenshot?"

Wait for their response. Once the section and view are selected, the `capture-screenshots` stage runs automatically.

**Guardrails**
- Screenshots should be captured at desktop viewport (1280px width)
- Use PNG format for all screenshots
- Name files descriptively: `[view-name]-[variant].png`
- Include both desktop and mobile variants when relevant
