---
when:
  steps: [design-shell:intake]
domain: [components, components.shell]
params:
  type: object
  properties:
    reference_dir: { type: string, default: "" }
result:
  type: object
  required: [component, output_path]
  properties:
    component:
      type: array
      items:
        $ref: ../schemas.yml#/Component
    output_path:
      type: string
reads:
  - path: $DESIGNBOOK_DATA/vision.md
  - path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
---

# Intake: Design Shell

Help the user design the application shell -- a `page` component with `header`, `content`, and `footer` slots, composed as a scene named `shell` in `design-system.scenes.yml`.

The `extract-reference` stage runs before intake. If a design reference was extracted, it is available at `$reference_dir/extract.json`. If `$reference_dir` is empty, no reference was extracted.

## Step 1: Analyze and Propose Layout

Review the product and sections, then present navigation options:

**If `$reference_dir` is non-empty and `$reference_dir/extract.json` exists**, analyze the landmark structure (header rows, footer sections, layout dimensions) and propose the layout pattern that matches the reference. Skip hypothetical options and present the derived layout directly.

**If `$reference_dir` is empty**, present options:

> "I'm designing the shell for **[Product Name]**. Based on your sections:
>
> 1. **[Section 1]** -- [Description]
> 2. **[Section 2]** -- [Description]
>
> Common layouts:
>
> **A. Top Navigation** -- Horizontal nav at top, content below
>    Best for: Corporate sites, marketing sites, fewer sections
>
> **B. Sidebar Navigation** -- Vertical nav on the left, content right
>    Best for: Apps with many sections, dashboards, admin panels
>
> **C. Minimal Header** -- Just logo + nav links in header
>    Best for: Simple sites, portfolio-style, few pages
>
> Based on **[Product Name]**, I'd suggest [suggestion] because [reason].
>
> Which pattern fits best?"

Wait for their response.

## Step 2: Plan Components

Follow the component planning process:
1. Scan existing components (location provided by framework rules)
3. Determine which shell components exist (reuse) vs. need creation (page, header, footer, navigation, etc.)

### Component Extraction Criteria

Identify atomic UI elements as separate components when they meet either condition:
- **Appears 2+ times** across the shell (e.g. a button style used in header and footer)
- **Is interactive** -- receives user input or triggers navigation (e.g. search field, CTA button, nav link with hover states)

Common atomic components to extract: `button`, `badge`, `icon`, `search`, `link` (when styled distinctly from plain text).

Single-use decorative elements remain inline in the parent component's template.

### Resolve Embed Dependencies

After assembling the initial component list, resolve embed dependencies from loaded blueprints:

1. For each proposed component, find the matching loaded blueprint
2. Collect all `embeds:` entries from those blueprints' frontmatter
3. Add any missing embedded components to the plan (e.g., if `header.md` has `embeds: [container]` and container is not yet in the list, add it)
4. Sort the final component list so that embedded components are built before their embedders (leaves first, dependents last)

Present the component plan and get user confirmation before proceeding.

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

Iterate until the user is satisfied. Once confirmed, proceed to the structure preview.

## Step 5: Structure Preview

Display a full recursive ASCII tree of the shell component structure so the user can verify the complete picture before building starts.

Follow the process in [structure-preview.md](partials/structure-preview.md).

**Input for the tree:**
- Root: the `page` component with all its slots and nested components
- Show `content -> $content` for the content injection point
- Title: "Shell Structure"

**Guardrails**
- Be conversational -- help the user think through layout decisions
- Navigation items should map to the product's sections
- Consider the product type when suggesting layout patterns
- If `design-system/design-system.scenes.yml` already exists, read it first and ask: "You already have a shell design. Would you like to update it or start fresh?"
- If page/header/footer components already exist, reuse them -- only create if missing

## Step 6: Complete Intake

Store the `component` and `output_path` as task results.

- **`component`**: one entry per new component. Each item needs `component` (name) and `slots` (array).
- **`output_path`**: `$DESIGNBOOK_DATA/design-system/design-system.scenes.yml`

Design reference data (`design_hint`, `reference_screenshot`) is not available during intake -- the `extract-reference` stage runs after intake and writes design data to `$reference_dir/extract.json` for downstream tasks.
