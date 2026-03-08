---
name: /debo-design-shell
id: debo-design-shell
category: Designbook
description: Design the application shell — page component with header, content, and footer slots
---

Help the user design the application shell — a `page` component with `header`, `content`, and `footer` slots, composed in a `shell.screen.yml`. The result is a visual screen preview in Storybook.

> **Spec Mode (`--spec`):** If the user passes `--spec`, do NOT create or modify any files. Instead, output a structured YAML plan showing what WOULD be created — file paths and content summaries. This enables testing without side effects.

**Steps**

## Step 1: Check Prerequisites

Check if the following files exist:
- `${DESIGNBOOK_DIST}/product/product-overview.md` — product vision (required)
- Section directories under `${DESIGNBOOK_DIST}/sections/` (required — at least one section must exist)
- `${DESIGNBOOK_DIST}/design-system/design-tokens.yml` — design tokens (optional)

**If product vision is missing**, tell the user:

> "Before designing the shell, you need to define your product. Please run:
> 1. `/debo-product-vision` — Define your product
> 2. `/debo-product-sections` — Define your sections"

Stop here.

**If no sections exist**, tell the user:

> "You need at least one section defined. Please run `/debo-product-sections` first."

Stop here.

Read all available files to understand the product context and list the sections.

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

## Step 5: Ensure Components Exist

Check if the following components exist under `$DESIGNBOOK_DRUPAL_THEME/components/`:

1. **`page`** — Container with slots: `header`, `content`, `footer`
2. **`header`** — Logo, navigation, CTA
3. **`footer`** — Footer links, copyright, social

For each missing component, create it using the `designbook-drupal-components` skill:

Read and execute: `.agent/skills/designbook-drupal-components-ui/SKILL.md`

### page component
```yaml
name: page
description: Application page container with header, content, and footer slots
status: stable
slots:
  - name: header
    title: Header
    description: Page header with navigation
  - name: content
    title: Content
    description: Main content area
  - name: footer
    title: Footer
    description: Page footer
```

### header component
```yaml
name: header
description: Application header with logo, navigation, and optional CTA
status: stable
props:
  - name: logo
    type: string
    title: Logo Text
    description: Site name or logo text
    required: true
  - name: nav_items
    type: array
    title: Navigation Items
    description: Array of navigation links with label and href
  - name: cta
    type: object
    title: Call to Action
    description: Optional CTA button with label and href
```

### footer component
```yaml
name: footer
description: Application footer with links, copyright, and social icons
status: stable
props:
  - name: links
    type: array
    title: Footer Links
    description: Array of links with label and href
  - name: copyright
    type: string
    title: Copyright Text
    description: Copyright notice
  - name: social
    type: array
    title: Social Links  
    description: Array of social media links with icon and href
```

If all components already exist, skip this step.

## Step 6: Create Shell Screen

Create the directory `${DESIGNBOOK_DIST}/shell/` if it doesn't exist.

Create `${DESIGNBOOK_DIST}/shell/shell.screen.yml` with this structure:

```yaml
name: "[Product Name] — Application Shell"
docs: |
  ## Layout Pattern
  [Description of layout — top nav, sidebar, minimal header, etc. and why]

  ## Navigation Structure
  [List of nav items and what they map to]

  ## Responsive Behavior
  - Desktop: [how it looks]
  - Tablet: [how it adapts]
  - Mobile: [how it adapts — hamburger menu, bottom nav, etc.]

  ## Design Notes
  [Any additional design decisions or conventions]

layout:
  shell:
    - component: page
      slots:
        header:
          - component: header
            props:
              logo: "[Product Name]"
              nav_items:
                - { label: "[Nav 1]", href: "/[section-1]" }
                - { label: "[Nav 2]", href: "/[section-2]" }
              cta:
                label: "[CTA text]"
                href: "/[cta-link]"
        content:
          - component: hero
            props:
              title: "Welcome to [Product Name]"
              description: "[Short product description]"
        footer:
          - component: footer
            props:
              copyright: "© [Year] [Product Name]"
              links:
                - { label: "Privacy", href: "/privacy" }
                - { label: "Terms", href: "/terms" }
              social:
                - { icon: "twitter", href: "#" }
```

Populate all values from the user's approved design in Step 4.

## Step 7: Confirm Completion

> "I've created the shell for **[Product Name]**:
>
> **Files created:**
>
> | File | Description |
> |------|-------------|
> | `shell/shell.screen.yml` | Shell screen composing page + header + footer |
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
- Components use the `designbook-drupal-components` skill for creation
- If `shell/shell.screen.yml` already exists, read it first and ask: "You already have a shell design. Would you like to update it or start fresh?"
- If page/header/footer components already exist, reuse them — only create if missing
- The `docs` field in the screen replaces the old `shell-spec.md` — no separate Markdown file needed
