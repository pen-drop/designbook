---
files: []
reads:
  - path: $DESIGNBOOK_HOME/product/vision.md
  - path: $DESIGNBOOK_HOME/design-system/design-tokens.yml
  - path: $DESIGNBOOK_HOME/design-system/guidelines.yml
---

# Intake: Design Shell

Help the user design the application shell — a `page` component with `header`, `content`, and `footer` slots, composed as a scene named `shell` in `design-system.scenes.yml`.

## Step 1: Analyze and Propose Layout

Review the product and sections, then present navigation options:

> "I'm designing the shell for **[Product Name]**. Based on your sections:
>
> 1. **[Section 1]** — [Description]
> 2. **[Section 2]** — [Description]
>
> Common layouts:
>
> **A. Top Navigation** — Horizontal nav at top, content below
>    Best for: Corporate sites, marketing sites, fewer sections
>
> **B. Sidebar Navigation** — Vertical nav on the left, content right
>    Best for: Apps with many sections, dashboards, admin panels
>
> **C. Minimal Header** — Just logo + nav links in header
>    Best for: Simple sites, portfolio-style, few pages
>
> Based on **[Product Name]**, I'd suggest [suggestion] because [reason].
>
> Which pattern fits best?"

Wait for their response.

## Step 2: Plan Components

Follow the component planning process in [plan-components.md](../../designbook-scenes/tasks/plan-components.md):
1. Read guidelines.yml for component patterns and naming conventions
2. Scan existing components (location provided by framework rules)
3. Determine which shell components exist (reuse) vs. need creation (page, header, footer, navigation, etc.)
4. Present the component plan and get user confirmation before proceeding

## Step 3: Gather Shell Details

Ask clarifying questions:

- "What navigation items should appear? (Based on your sections, I suggest: [list])"
- "Where should the user menu / contact info appear? (Top right is common)"
- "Do you need any additional items? (Search, language switcher, CTA button, etc.)"
- "How should it adapt on mobile? (Hamburger menu, collapsible sidebar, bottom nav)"
- "Footer: What links, copyright text, and social icons should appear?"

## Step 4: Present Shell Design

> "Here's the shell design for **[Product Name]**:
>
> **Layout Pattern:** [chosen pattern]
>
> **Header:**
> - Logo: [product name]
> - Navigation: [nav items list]
> - CTA: [if any]
>
> **Footer:**
> - Links: [list]
> - Copyright: [text]
> - Social: [if any]
>
> **Responsive Behavior:**
> - Desktop: [how it looks]
> - Mobile: [how it adapts]
>
> Does this match what you had in mind?"

Iterate until the user is satisfied. Once confirmed, proceed to Step 5.

## Step 5: Design Reference (optional)

Check `guidelines.yml` for `design_file` or `mcp` entries. If a design source is configured:

1. Load available screens (e.g. `mcp__stitch__list_screens`)
2. Ask the user which screen matches the shell:

> "I found these design screens. Which one shows the shell/page layout?
>
> 1. **Model - Die Putz-Ziege (Desktop)**
> 2. **Home - Kinetic Lab**
> 3. _(skip — no reference)_"

3. Store the selection as a `reference` param for the shell scene.

If no design source is configured, skip silently.

The `create-component` and `create-shell-scene` stages run automatically.

**Guardrails**
- Be conversational — help the user think through layout decisions
- Navigation items should map to the product's sections
- Consider the product type when suggesting layout patterns
- If `design-system/design-system.scenes.yml` already exists, read it first and ask: "You already have a shell design. Would you like to update it or start fresh?"
- If page/header/footer components already exist, reuse them — only create if missing
