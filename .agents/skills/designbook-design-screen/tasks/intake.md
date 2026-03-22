---
files: []
reads:
  - path: $DESIGNBOOK_DIST/data-model.yml
  - path: $DESIGNBOOK_DIST/design-system/design-system.scenes.yml
  - path: $DESIGNBOOK_DIST/design-system/guidelines.yml
---

# Intake: Design Screen

Help the user select a section and define the components needed to design a full screen. The result feeds `create-component`, `plan-entities`, `create-sample-data`, `map-entity`, and `create-section-scene` stages.

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

## Step 2: Plan Components

Follow the component planning process in [plan-components.md](../../designbook-scenes/tasks/plan-components.md):
1. Read guidelines.yml for component patterns and naming conventions
2. Scan existing components (location provided by framework rules)
3. Based on the section spec, data model, and sample data, identify UI components needed beyond entities and shell (filter bars, cards, badges, stat displays, empty states, pagination, etc.)
4. Present the component plan (existing vs. new) and get user confirmation

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

Once confirmed, proceed to Step 3.

## Step 3: Design Reference (optional)

Check `guidelines.yml` for `design_file` or `mcp` entries. If a design source is configured:

1. Load available screens from the design source (e.g. `mcp__stitch__list_screens` for Stitch)
2. For each planned scene, ask the user to select a matching design screen:

> "I found these design screens:
>
> 1. **Model - Die Putz-Ziege (Desktop)** (2560x3328)
> 2. **Configurator - Build Your Own** (780x3796)
> 3. _(skip — no reference for this scene)_
>
> Which screen matches the **[scene-name]** scene?"

3. Store the selection as a `reference` param per scene:
   ```json
   { "type": "stitch", "url": "<screen-resource-name>", "title": "<screen-title>" }
   ```

If no design source is configured in guidelines, skip this step silently.

The subsequent stages run automatically.

**Guardrails**

- Reference the section spec for required user flows and UI requirements
- Reference the sample data for what content is available to display
- Reference design tokens for colors and typography
- Reference the shell for navigation context
- Each scene should address specific user flows from the section spec
- Consider responsive behavior for all scenes
