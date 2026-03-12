---
name: /debo-design-shell
id: debo-design-shell
category: Designbook
description: Design the application shell — page component with header, content, and footer slots
---

Help the user design the application shell — a `page` component with `header`, `content`, and `footer` slots, composed in a `spec.shell.scenes.yml`. The result is a visual screen preview in Storybook.

> **Spec Mode (`--spec`):** If the user passes `--spec`, do NOT create or modify any files. Instead, output a structured YAML plan showing what WOULD be created — file paths and content summaries. This enables testing without side effects.

**Steps**

## Step 1: Check Prerequisites

Check if the following files exist:
- `${DESIGNBOOK_DIST}/product/vision.md` — product vision (required)
- `${DESIGNBOOK_DIST}/design-system/design-tokens.yml` — design tokens (optional)
- Section directories under `${DESIGNBOOK_DIST}/sections/` (optional — used for navigation suggestions)

**If product vision is missing**, tell the user:

> "Before designing the shell, you need to define your product. Please run `/debo-product-vision` first."

Stop here.

Read all available files to understand the product context. If sections exist, use them for navigation suggestions.

## Step 2: Analyze and Propose Layout

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

Iterate until the user is satisfied.

## Step 5: Generate Shell Components

> ⛔ **MANDATORY**: Read `@designbook-components-sdc/resources/shell-generation.md` **before generating any shell files**. It defines the complete shell workflow: required sub-components, slot structure, and story format.

Follow the Shell Generation Steps from that resource. For each component file:

- **`.component.yml`** → Follow `@designbook-components-sdc/resources/component-yml.md`
- **`.story.yml`** → Follow `@designbook-components-sdc/resources/story-yml.md`
- **`.twig`** → Follow `@designbook-components-sdc/resources/twig.md`
- **General rules** → Follow `@designbook-components-sdc/resources/rules.md`

**Do NOT invent component structures.** The skill resources are the single source of truth.

## Step 6: Create Shell Scenes

> ⛔ **MANDATORY**: Read `@designbook-scenes/SKILL.md` for the `*.scenes.yml` format specification before creating the shell scenes file.

Create the directory `${DESIGNBOOK_DIST}/shell/` if it doesn't exist.

Create `${DESIGNBOOK_DIST}/shell/spec.shell.scenes.yml` following the format from the scenes skill. The shell scenes file is standalone (no `layout:` — it IS the layout that other scenes inherit from).

**Write the approved design from Step 4 into the metadata keys:**
- `description` — summarize the shell layout (pattern, key features, responsive behavior)
- `status` — set to `planned` initially
- `order` — set to `0` (shell always comes first)

```yaml
id: shell
title: Application Shell
description: Top-navigation layout with logo, main nav, CTA button, and multi-column footer. Responsive hamburger menu on mobile.
status: planned
order: 0

name: "Designbook/Shell"
scenes:
  - name: default
    layout:
      header:
        - component: header
          story: default
      content:
        - component: hero
          story: default
      footer:
        - component: footer
          story: default
```

Populate slot content based on the components created in Step 5 and the user's approved design from Step 4.

## Step 7: Validate Stories

Render all shell stories headlessly to verify they produce valid HTML:

```bash
node packages/storybook-addon-designbook/dist/cli.js validate story shell
```

If errors are found, fix them before proceeding. Common issues:
- Twig syntax errors in templates
- Missing component references
- Broken slot composition

## Step 8: Confirm Completion

> "I've created the shell for **[Product Name]**:
>
> **Files created:**
>
> | File | Description |
> |------|-------------|
> | `shell/spec.shell.scenes.yml` | Shell screen composing page + header + footer |
> | `components/page/` | Page container with header, content, footer slots |
> | `components/header/` | Header with logo, navigation, CTA |
> | `components/footer/` | Footer with links, copyright, social |
>
> **Shell design:**
> - Layout: [pattern]
> - Navigation: [N] items
> - Responsive: [mobile approach]
>
> Open Storybook to see the visual shell preview. You can run `/design-shell` again to update it."

**Guardrails**
- Be conversational — help the user think through layout decisions
- Navigation items should map to the product's sections
- Consider the product type when suggesting layout patterns
- Components use the `designbook-components-sdc` skill for creation
- If `shell/spec.shell.scenes.yml` already exists, read it first and ask: "You already have a shell design. Would you like to update it or start fresh?"
- If page/header/footer components already exist, reuse them — only create if missing
- The `description` field in the scenes file captures the shell design — no separate Markdown spec file needed

## Workflow Tracking

Load `@designbook-workflow/SKILL.md`.

At workflow start, create the tracking file:
```
WORKFLOW_NAME=$(node packages/storybook-addon-designbook/dist/cli.js workflow create --workflow debo-design-shell --title "Design Shell" --task "create-spec:Create shell spec:scene" --task "create-component:Create shell components:component" --task "create-scene:Create shell scene:scene")
```

If `--spec`: output the plan and stop here.

After completing each step, update:
```
node packages/storybook-addon-designbook/dist/cli.js workflow update $WORKFLOW_NAME <task-id> --status done
```
