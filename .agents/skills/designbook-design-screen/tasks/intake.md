---
files: []
reads:
  - path: $DESIGNBOOK_DIST/data-model.yml
  - path: $DESIGNBOOK_DIST/design-system/design-system.scenes.yml
---

# Intake: Design Screen

Help the user select a section and define the components needed to design a full screen. The result feeds `create-component`, `collect-entities`, `create-sample-data`, `map-entity`, and `create-section-scene` stages.

## Step 1: Select Section

Parse the sections directory. For each subdirectory check:
- `*.section.scenes.yml` exists → ✓ Scenes (required)
- `data.yml` exists → ✓ Data (generated automatically if missing — not a blocker)

Present only sections that have a scenes file:

> "Sections ready for screen design:
>
> 1. **[Section 1]** — ✓ Scenes, ✓ Data [, ✓ Components already exist]
> 2. **[Section 2]** — ✓ Scenes, ✗ Data _(will be generated)_
>
> Which section would you like to design?"

Sections without a scenes file are not listed (run `/debo-shape-section` first).

Wait for their response.

## Step 2: Propose and Confirm Components

Review the section spec, data model, and sample data. Identify UI components needed beyond entities and shell (filter bars, cards, badges, stat displays, empty states, pagination, etc.). Check existing components for reuse.

Present proposals:

> "For **[Section Title]**, I suggest these UI components:
>
> | # | Component | Slots | Purpose |
> |---|-----------|-------|---------|
> | 1 | **search-filter** | query, filters | Search bar with filter controls |
> | 2 | **pet-card** | image, title, badges, action | Pet listing card |
> | ✓ | ~~heading~~ | _(exists)_ | Reuse existing |
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

The following fields are **auto-set from context** (do NOT ask the user):
- `status` → `experimental`
- `provider` → from `$DESIGNBOOK_DRUPAL_THEME` name or designbook.config.yml
- `description` → auto-generated from section context

Once confirmed, the subsequent stages run automatically.

**Guardrails**

- Reference the section spec for required user flows and UI requirements
- Reference the sample data for what content is available to display
- Reference design tokens for colors and typography
- Reference the shell for navigation context
- Each scene should address specific user flows from the section spec
- Consider responsive behavior for all scenes
