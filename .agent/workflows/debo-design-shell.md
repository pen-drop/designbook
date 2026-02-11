---
name: /design-shell
id: design-shell
category: Designbook
description: Design the application shell — navigation and layout
---

Help the user design the application shell — the persistent navigation and layout that wraps all sections. The result is saved to `${DESIGNBOOK_DIST}/design-shell/shell-spec.md`.

**Steps**

## Step 1: Check Prerequisites

Check if the following files exist:
- `${DESIGNBOOK_DIST}/product/product-overview.md` — product vision (required)
- `${DESIGNBOOK_DIST}/product/product-roadmap.md` — roadmap sections (required)
- `${DESIGNBOOK_DIST}/design-system/design-tokens.md` — design tokens (optional)

**If product vision or roadmap are missing**, tell the user:

> "Before designing the shell, you need to define your product and sections. Please run:
> 1. `/debo-product-vision` — Define your product
> 2. `/debo-product-roadmap` — Define your sections"

Stop here.

**If design tokens are missing**, show a warning but continue:

> "Note: Design tokens haven't been defined yet. I'll proceed with the specification, but you may want to run `/debo-design-tokens` first for consistent design decisions."

Read all available files to understand the product context.

## Step 2: Analyze and Propose Layout

Review the roadmap sections and present navigation options:

> "I'm designing the shell for **[Product Name]**. Based on your roadmap, you have [N] sections:
>
> 1. **[Section 1]** — [Description]
> 2. **[Section 2]** — [Description]
>
> Let's decide on the shell layout. Common patterns:
>
> **A. Top Navigation** — Horizontal nav at top, content below
>    Best for: Corporate sites, marketing sites, fewer sections
>
> **B. Sidebar Navigation** — Vertical nav on the left, content on the right
>    Best for: Apps with many sections, dashboards, admin panels
>
> **C. Minimal Header** — Just logo + nav links in header
>    Best for: Simple sites, portfolio-style, few main pages
>
> Based on **[Product Name]**, I'd suggest [suggestion] because [reason].
>
> Which pattern fits best?"

Wait for their response.

## Step 3: Gather Shell Details

Ask clarifying questions:

- "What navigation items should appear? (Based on your roadmap, I suggest: [list])"
- "Where should the user menu / contact info appear? (Top right is common)"
- "Do you need any additional items? (Search, language switcher, CTA button, etc.)"
- "How should it adapt on mobile? (Hamburger menu, collapsible sidebar, bottom nav)"
- "What should the default / home view be when someone visits the site?"

## Step 4: Present Shell Specification

> "Here's the shell specification for **[Product Name]**:
>
> **Layout Pattern:** [chosen pattern]
>
> **Navigation:**
> - [Nav Item 1] → [Section]
> - [Nav Item 2] → [Section]
>
> **User Menu:** [description]
>
> **Responsive Behavior:**
> - Desktop: [how it looks]
> - Mobile: [how it adapts]
>
> Does this match what you had in mind?"

Iterate until the user is satisfied.

## Step 5: Save the File

Once approved, create the file at `${DESIGNBOOK_DIST}/design-shell/shell-spec.md` with this exact format:

```markdown
# Application Shell

## Overview
[Description of the shell design and its purpose for this product]

## Navigation Structure
- [Nav Item 1] → [Section or page it leads to]
- [Nav Item 2] → [Section or page it leads to]
- [Additional items]

## User Menu
[Description of user menu location and contents, or contact info placement]

## Layout Pattern
[Description of the layout — top nav, sidebar, minimal header, etc. and why]

## Responsive Behavior
- Desktop: [How it looks and behaves]
- Tablet: [How it adapts]
- Mobile: [How it adapts — hamburger menu, bottom nav, etc.]

## Design Notes
[Any additional design decisions, conventions, or notes]
```

Create the directory `${DESIGNBOOK_DIST}/design-shell/` if it doesn't exist.

## Step 6: Confirm Completion

> "I've saved the shell specification to `${DESIGNBOOK_DIST}/design-shell/shell-spec.md`.
>
> **Shell design:**
> - Layout: [pattern]
> - Navigation: [N] items
> - Responsive: [mobile approach]
>
> Open Storybook to see the specification on the Design Shell page. You can run `/design-shell` again anytime to update it."

**Guardrails**
- Be conversational — help the user think through layout decisions
- Keep the spec focused on design decisions, not implementation details
- Navigation items should map to roadmap sections where possible
- Consider the product type when suggesting layout patterns (corporate site vs. app vs. tool)
- The markdown format must match exactly for Storybook to parse it
- If `${DESIGNBOOK_DIST}/design-shell/shell-spec.md` already exists, read it first and ask: "You already have a shell specification. Would you like to update it or start fresh?"
