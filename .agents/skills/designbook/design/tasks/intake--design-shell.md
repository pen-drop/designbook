---
when:
  steps: [design-shell:intake]
files: []
reads:
  - path: $DESIGNBOOK_DATA/vision.md
  - path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
---

# Intake: Design Shell

Help the user design the application shell — a `page` component with `header`, `content`, and `footer` slots, composed as a scene named `shell` in `design-system.scenes.yml`.

## Step 1: Resolve Design Reference

> ⛔ **MANDATORY**: Execute this step before any layout analysis or component planning.

1. Check `vision.md` → `## Design Reference` section for a configured reference source.
2. If no configured source, ask the user:
   > "Do you have a design reference? (Stitch screen ID, URL, or 'skip')"
3. If a **Stitch screen ID** is provided, resolve it via MCP (`mcp__stitch__get_screen`) to get the preview URL. Store as `reference: [{type: "url", url: "<resolved-url>", threshold: 3, title: "<screen-title>"}]`.
4. If a **URL** is provided, store as `reference: [{type: "url", url: "<url>", threshold: 3, title: "<label>"}]`.
5. If **skipped**, proceed without reference.

Reference entries describe the design source only — no `breakpoint` field. Breakpoints are resolved separately in design-verify intake.

If a reference was loaded, use it as the primary input for all subsequent steps. When proposing layouts and components, **derive them from the reference** rather than asking the user speculative questions.

## Step 2: Analyze and Propose Layout

Review the product and sections, then present navigation options:

**If a design reference is available**, analyze its structure (header, nav, footer, content area) and propose the layout pattern that matches the reference. Skip hypothetical options and present the derived layout directly.

**If no design reference**, present options:

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

## Step 3: Plan Components

Follow the component planning process:
1. Scan existing components (location provided by framework rules)
3. Determine which shell components exist (reuse) vs. need creation (page, header, footer, navigation, etc.)

**If a design reference is available**, derive the component list from the reference HTML structure rather than guessing.

4. Present the component plan and get user confirmation before proceeding

## Step 4: Gather Shell Details

**If a design reference is available**, extract details from the reference and present them for confirmation rather than asking open-ended questions.

**If no design reference**, ask clarifying questions:

- "What navigation items should appear? (Based on your sections, I suggest: [list])"
- "Where should the user menu / contact info appear? (Top right is common)"
- "Do you need any additional items? (Search, language switcher, CTA button, etc.)"
- "How should it adapt on mobile? (Hamburger menu, collapsible sidebar, bottom nav)"
- "Footer: What links, copyright text, and social icons should appear?"

## Step 5: Present Shell Design

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

Iterate until the user is satisfied. Once confirmed, proceed to the structure preview.

## Step 6: Structure Preview

Display a full recursive ASCII tree of the shell component structure so the user can verify the complete picture before building starts.

Follow the process in [structure-preview.md](partials/structure-preview.md).

**Input for the tree:**
- Root: the `page` component with all its slots and nested components
- Show `content → $content` for the content injection point
- Title: "Shell Structure"

**Guardrails**
- Be conversational — help the user think through layout decisions
- Navigation items should map to the product's sections
- Consider the product type when suggesting layout patterns
- If `design-system/design-system.scenes.yml` already exists, read it first and ask: "You already have a shell design. Would you like to update it or start fresh?"
- If page/header/footer components already exist, reuse them — only create if missing

## Step 7: Complete Intake

Mark intake done with `--params` that populate **both** the `component` and `scene` iterables:

```bash
_debo workflow done --workflow $WORKFLOW_NAME --task intake --params '{
  "component": [
    { "component": "page", "slots": ["header", "content", "footer"] },
    { "component": "header", "slots": ["logo", "navigation"] },
    { "component": "footer", "slots": ["links", "copyright"] }
  ],
  "scene": [
    { "scene": "design-system:shell" }
  ]
}'
```

- **`component`**: one entry per new component. Each item needs `component` (name) and `slots` (array).
- **`scene`**: one entry per shell scene. Uses `group:sceneName` format matching `_debo story --scene` resolution. For shell: `{ "scene": "design-system:shell" }`.
