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
> Open Storybook to see the screen designs on the section page. You can run `/design-screen` again to add more views, or proceed to `/screenshot-design` for capturing screenshots."

**Guardrails**
- Reference the section spec for required user flows and UI requirements
- Reference the sample data for what content is available to display
- Reference design tokens for colors and typography
- Reference the shell spec for navigation context
- Each view should address specific user flows from the section spec
- Descriptions should be specific enough to guide implementation
- Consider responsive behavior for all views
- Focus on what the user sees and does, not implementation details
