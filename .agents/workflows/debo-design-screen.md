---
name: /debo-design-screen
id: debo-design-screen
category: Designbook
description: Create screen design components for a section
workflow:
  title: Design Screen
  stages: [dialog, create-component, collect-entities, ensure-sample-data, map-entity, compose-entity, create-section-scene]
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
  - path: $DESIGNBOOK_DIST/sections/[section-id]/*.section.scenes.yml
    optional: true
  - path: $DESIGNBOOK_DIST/sections/[section-id]/data.yml
    
---


Help the user create screen design components for one of their roadmap sections. Each section gets a single `{section}.scenes.yml` file containing all scenes (pages/views) for that section.

> **Spec Mode (`--spec`):** If the user passes `--spec`, do NOT create or modify any files. Instead, output a structured summary showing what WOULD be created — file paths, component names, view modes, and scene definitions. This enables testing without side effects.

**Steps**

## Step 0: Load Workflow Tracking

Load the `designbook-workflow` skill via the Skill tool.

Read all available prerequisite files to understand the full context.

## Step 1: Select Section

Parse the sections directory. For each subdirectory check:
- `*.section.scenes.yml` exists → ✓ Scenes (required)
- `data.yml` exists → ✓ Data (generated automatically if missing — not a blocker)

Present only sections that have a scenes file. Sections without a scenes file are excluded:

> "Sections ready for screen design:
>
> 1. **[Section 1]** — ✓ Scenes, ✓ Data [, ✓ Components already exist]
> 2. **[Section 2]** — ✓ Scenes, ✗ Data _(will be generated)_
>
> Which section would you like to design?"

Sections with `✗ No scenes` are not listed (they cannot be designed yet — run `/debo-shape-section` first). Missing `data.yml` is not a blocker — the `ensure-sample-data` stage generates it automatically.

Wait for their response.

## Step 2: Propose and Confirm Components

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

Once the component list is confirmed, the `create-component`, `map-entity`/`compose-entity`, and `create-scene` stages run automatically. For each entity in the scene, check `composition` in data-model.yml and `view_mode` to determine which stage applies — see `designbook-scenes` routing table.

**Guardrails**

- Reference the section spec for required user flows and UI requirements
- Reference the sample data for what content is available to display
- Reference design tokens for colors and typography
- Reference the shell for navigation context
- Each scene should address specific user flows from the section spec
- Consider responsive behavior for all scenes
- The generation sub-steps must run in order: UI components → entity mapping (`map-entity` or `compose-entity`) → scenes (each depends on the previous)
- **One `.scenes.yml` file per section** — all scenes for a section live in one file
- The `name` field in `.scenes.yml` is the full Storybook sidebar path (e.g. `Designbook/Sections/Blog`)
- Component skills are loaded by convention: `designbook-components-$DESIGNBOOK_FRAMEWORK_COMPONENT` — never hardcode a specific framework
- CSS generation is delegated to `//debo-css-generate` — never load CSS skills directly in this workflow


