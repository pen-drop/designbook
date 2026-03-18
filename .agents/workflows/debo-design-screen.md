---
name: /debo-design-screen
id: debo-design-screen
category: Designbook
description: Create screen design components for a section
workflow:
  title: Design Screen
  stages: [dialog, create-component, create-view-modes, create-scene]
before:
  - workflow: /debo-css-generate
    execute: if-never-run
reads:
  - path: ${DESIGNBOOK_DIST}/data-model.yml
    workflow: /debo-data-model
  - path: ${DESIGNBOOK_DIST}/design-system/design-system.scenes.yml
    workflow: /debo-design-shell
  - path: ${DESIGNBOOK_DIST}/design-system/design-tokens.yml
    optional: true
    workflow: /debo-design-tokens
---

Help the user create screen design components for one of their roadmap sections. Each section gets a single `{section}.scenes.yml` file containing all scenes (pages/views) for that section.

> **Spec Mode (`--spec`):** If the user passes `--spec`, do NOT create or modify any files. Instead, output a structured summary showing what WOULD be created — file paths, component names, view modes, and scene definitions. This enables testing without side effects.

**Steps**

## Step 0: Load Workflow Tracking

Load the `designbook-workflow` skill via the Skill tool.

## Step 1: Load Configuration & Check Prerequisites

Load configuration using the `@designbook-configuration` skill to resolve environment variables (`$DESIGNBOOK_FRAMEWORK_COMPONENT`, `$DESIGNBOOK_FRAMEWORK_CSS`, `$DESIGNBOOK_DIST`, `$DESIGNBOOK_DRUPAL_THEME`).

Check if the following files exist for the target section:

- `$DESIGNBOOK_DIST/sections/[section-id]/*.section.scenes.yml` — section scenes file (required)
- `$DESIGNBOOK_DIST/sections/[section-id]/data.yml` — sample data (required)
- `$DESIGNBOOK_DIST/data-model.yml` — data model (required)
- `$DESIGNBOOK_DIST/design-system/design-system.scenes.yml` — application shell (required)
- Page, header, footer components in `$DESIGNBOOK_DRUPAL_THEME/components/` (required)
- `$DESIGNBOOK_DIST/design-system/design-tokens.yml` — design tokens (optional)

**If shell or shell components are missing**, tell the user:

> "Before creating screen designs, you need the application shell. Please run `/debo-design-shell` first."

Stop here.

**If section spec or data are missing**, tell the user:

> "Before creating screen designs for this section, you need:
>
> 1. `/debo-shape-section` — Define the section specification
> 2. `/debo-sample-data` — Create sample data
>
> Please run these commands first."

Stop here.

Read all available prerequisite files to understand the full context.

## Step 2: Select Section

Parse the sections directory and identify sections that have both spec and data. Present them:

> "Sections ready for screen design:
>
> 1. **[Section 1]** — ✓ Spec, ✓ Data [, ✓ Scenes already exist]
> 2. **[Section 2]** — ✓ Spec, ✓ Data
>
> Which section would you like to design?"

Wait for their response.

## Step 3: Propose and Confirm Components

Review the section spec, data model, and sample data. Identify UI components needed beyond entities and shell (filter bars, cards, badges, stat displays, empty states, pagination, etc.). Check `$DESIGNBOOK_DRUPAL_THEME/components/` for existing components that can be reused.

Present proposals to the user:

> "For **[Section Title]**, I suggest these UI components:
>
> | #   | Component         | Slots                        | Purpose                         |
> | --- | ----------------- | ---------------------------- | ------------------------------- |
> | 1   | **search-filter** | query, filters               | Search bar with filter controls |
> | 2   | **pet-card**      | image, title, badges, action | Pet listing card                |
> | ✓   | ~~heading~~       | _(exists)_                   | Reuse existing                  |
>
> Want to adjust, add, or remove any? Or proceed with these?"

Wait for user response. Adjust the list based on feedback.

For each new component, present details for confirmation:

> "**Component: [name]**
>
> **Slots:** [slot list with descriptions]
> **Variants:** [variant list or 'default only']
> **Props:** [prop list or 'none']
>
> Look good? (y / adjust)"

Wait for confirmation. The following fields are **auto-set from context** (do NOT ask the user):
- `status` → `experimental`
- `provider` → from `$DESIGNBOOK_DRUPAL_THEME` name or designbook.config.yml
- `description` → auto-generated from section context

Once the component list is confirmed, the `create-component`, `create-view-modes`, and `create-scene` stages run automatically.

**Guardrails**

- Reference the section spec for required user flows and UI requirements
- Reference the sample data for what content is available to display
- Reference design tokens for colors and typography
- Reference the shell for navigation context
- Each scene should address specific user flows from the section spec
- Consider responsive behavior for all scenes
- The 3 generation sub-steps must run in order: UI components → view modes → scenes (each depends on the previous)
- **One `.scenes.yml` file per section** — all scenes for a section live in one file
- The `name` field in `.scenes.yml` is the full Storybook sidebar path (e.g. `Designbook/Sections/Blog`)
- Component skills are loaded by convention: `designbook-components-$DESIGNBOOK_FRAMEWORK_COMPONENT` — never hardcode a specific framework
- CSS generation is delegated to `//debo-css-generate` — never load CSS skills directly in this workflow


