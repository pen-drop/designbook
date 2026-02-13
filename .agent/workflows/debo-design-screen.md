---
name: /debo-design-screen
id: debo-design-screen
category: Designbook
description: Create screen design components for a section
---

Help the user create screen design components for one of their roadmap sections. Screen designs are documented in `designbook/sections/[section-id]/screen-designs.md`.

**Steps**

## Step 1: Check Prerequisites

Check if the following files exist for the target section:
- `designbook/sections/[section-id]/spec.md` — section spec (required)
- `designbook/sections/[section-id]/data.json` — sample data (required)
- `designbook/design-system/design-tokens.md` — design tokens (optional)
- `designbook/design-shell/shell-spec.md` — application shell (optional)

**If spec or data are missing**, tell the user:

> "Before creating screen designs, you need:
> 1. `/debo-shape-section` — Define the section specification
> 2. `/debo-sample-data` — Create sample data
>
> Please run these commands first."

Stop here.

Read all available files to understand the full context.

## Step 2: Select Section

Parse the roadmap and identify sections that have both spec and data. Present them:

> "Sections ready for screen design:
>
> 1. **[Section 1]** — ✓ Spec, ✓ Data [, ✓ Screen Designs already exist]
> 2. **[Section 2]** — ✓ Spec, ✓ Data
>
> Which section would you like to design?"

Wait for their response.

## Step 3: Analyze and Propose Views

Based on the section spec and sample data, identify the needed screen designs:

> "Based on the **[Section Title]** specification and data, I suggest these screen designs:
>
> 1. **[ViewName]** — [Description of what this view shows]
>    - Displays: [which data entities]
>    - Key patterns: [list/grid/detail/form]
>
> 2. **[ViewName2]** — [Description]
>    - Displays: [entities]
>    - Key patterns: [patterns]
>
> Which view shall we start with? Or would you like to add/modify the list?"

Wait for their response.

## Step 4: Design the Screen

For each view, discuss the design:

- "What layout pattern works best? (Grid, list, cards, split view)"
- "What actions should users be able to take? (View, filter, sort, click-through)"
- "What information is most important to show first?"
- "How should it look on mobile?"

Present a design summary:

> "**[ViewName] Design:**
>
> **Layout:** [description]
> **Primary content:** [what's displayed prominently]
> **Secondary content:** [supporting information]
> **Actions:** [user interactions]
> **Mobile:** [how it adapts]
>
> Shall I document this?"

## Step 5: Save Screen Designs Document

Once approved, create or update `designbook/sections/[section-id]/screen-designs.md`:

```markdown
# Screen Designs

### [ViewName]
[Description of the view, its purpose, layout pattern, key UI elements, data displayed, and user interactions. Include mobile behavior.]

### [ViewName2]
[Description]
```

Create the directory if needed.

## Step 6: Confirm Completion

> "I've saved the screen designs to `designbook/sections/[section-id]/screen-designs.md`.
>
> **[Section Title] screen designs:**
> - [N] views documented
> - [List view names]
>
> Open Storybook to see the screen designs on the section page. You can run `/debo-design-screen` again to add more views.
>
> **Would you like to generate design components from these screen designs?**
> This will create structural components for Shell, Entity, and Screen."

If the user says **no**, stop here.

If the user says **yes**, proceed to Step 7.

## Step 7: Generate Design Components

Run the three design skills in sequence. Each skill is defined in `.agent/skills/`:

**7.1 — Generate Shell Components**

Load and execute the `designbook-shell` skill (`.agent/skills/designbook-shell/SKILL.md`).

This generates `$DESIGNBOOK_DIST/design/shell/header/` and `$DESIGNBOOK_DIST/design/shell/footer/` with structural header/footer components. Navigation is auto-derived from `sections/*.section.yml` files.

**7.2 — Generate Entity Components**

Load and execute the `designbook-entity` skill (`.agent/skills/designbook-entity/SKILL.md`) with `section-id` parameter.

This reads `data-model.json`, identifies which UI components are needed for each field, checks the existing component library for reusable components, creates missing UI components, and generates entity design components that reference real UI components in their stories.

**7.3 — Generate Screen Components**

Load and execute the `designbook-screen` skill (`.agent/skills/designbook-screen/SKILL.md`) with `section-id` parameter.

This reads `screen-designs.md`, checks for section-level UI components (filter bars, sidebars, etc.), composes shell + entity components into full screen views, and generates one screen component per page. The result is a **complete visual page design** viewable in Storybook.

## Step 8: Confirm Generation

> "✅ **Design components generated!**
>
> | Layer | Component | Location |
> |-------|-----------|----------|
> | Shell | `shell_header` | `design/shell/header/` |
> | Shell | `shell_footer` | `design/shell/footer/` |
> | Entity | `entity_node_[bundle]` | `design/entity/node/[bundle]/` |
> | Screen | `section_[id]_[page]` | `design/sections/[id]/[page]/` |
>
> Open Storybook to see the full page compositions under **Design/** and **Sections/** in the sidebar.
>
> You can run `/screenshot-design` to capture screenshots for documentation."

**Guardrails**
- Reference the section spec for required user flows and UI requirements
- Reference the sample data for what content is available to display
- Reference design tokens for colors and typography
- Reference the shell spec for navigation context
- Each view should address specific user flows from the section spec
- Descriptions should be specific enough to guide implementation
- Consider responsive behavior for all views
- Focus on what the user sees and does, not implementation details
- Component generation (Step 7) is optional — the screen designs in markdown are the primary artifact
- The 3 skills must run in order: shell → entity → screen (each depends on the previous)
- Each skill delegates to `designbook-drupal-components` for file creation

