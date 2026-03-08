---
name: /shape-section
id: shape-section
category: Designbook
description: Define a section specification — user flows, UI requirements, and scope
---

Help the user define a section specification for one of their roadmap sections. The result is saved to `${DESIGNBOOK_DIST}/sections/[section-id]/spec.section.yml`.

> **Spec Mode (`--spec`):** If the user passes `--spec`, do NOT create or modify any files. Instead, output a structured YAML plan showing what WOULD be created — file paths and content summaries. This enables testing without side effects.
**Steps**

## Step 1: Check Prerequisites

Check if the following files exist:
- `${DESIGNBOOK_DIST}/product/product-overview.md` — product vision (required)
- `${DESIGNBOOK_DIST}/data-model.yml` — data model (optional, helpful)
- `${DESIGNBOOK_DIST}/design-system/design-tokens.md` — design tokens (optional)
- `${DESIGNBOOK_DIST}/design-shell/shell-spec.md` — application shell (optional)

**If product vision or roadmap are missing**, tell the user:

> "Before shaping sections, you need to define your product and roadmap. Please run:
> 1. `/debo-product-vision` — Define your product
> 2. `/debo-product-sections` — Define your sections"

Stop here.

Read all available files to understand the product context.

## Step 2: Select Section

Parse the roadmap to extract the sections. Check which sections already have specs by looking for existing files at `${DESIGNBOOK_DIST}/sections/[section-id]/spec.section.yml`.

**Section ID conversion:** Convert the section title to kebab-case by lowercasing, removing `&`, replacing non-alphanumeric characters with `-`, and trimming leading/trailing dashes. Examples:
- "Homepage" → "homepage"
- "About & Team" → "about-team"
- "Blog & Contact" → "blog-contact"

Present the sections to the user:

> "Here are your roadmap sections:
>
> 1. **[Section 1]** — [Description] ✓ (already specified) / ○ (not yet specified)
> 2. **[Section 2]** — [Description] ○
>
> Which section would you like to shape?"

If only one section is unspecified, auto-select it. If all sections are specified, ask if the user wants to update an existing one.

If a section already has a spec file, read it first and ask: "This section already has a specification. Would you like to update it or start fresh?"

Wait for their response.

## Step 3: Gather Section Requirements

Ask 4–6 clarifying questions based on the section context. Consider the product type, data model, and shell specification when forming questions. Key areas to cover:

- "What are the main user actions or tasks in this section?"
- "What information should be displayed? (Consider the data model entities: [list relevant entities])"
- "What are the key user flows? (e.g., browse → view detail → take action)"
- "What UI patterns fit best? (e.g., list view, grid, cards, detail page, form)"
- "What's in scope and what's explicitly out of scope?"
- "Should this section be wrapped in the application shell? (Based on your shell spec: [describe shell])"

Adapt the questions based on the specific section. For example:
- Homepage: Focus on hero sections, calls-to-action, featured content
- Services: Focus on service presentation, comparison, detail pages
- Portfolio: Focus on project showcase, filtering, case study format
- About & Team: Focus on team presentation, company story, trust signals
- Blog & Contact: Focus on article layout, categories, contact form design

Wait for their response.

## Step 4: Present Draft Specification

> "Here's the specification for **[Section Title]**:
>
> **Overview:** [2-3 sentence description of the section's purpose and scope]
>
> **User Flows:**
> - [Flow 1: step-by-step description]
> - [Flow 2: step-by-step description]
>
> **UI Requirements:**
> - [Requirement 1]
> - [Requirement 2]
>
> **Configuration:**
> - Shell: [true/false — whether to wrap in app shell]
>
> Does this capture what you had in mind? Any changes?"

Iterate until the user is satisfied.

## Step 5: Save the File

Once approved, create the file at `${DESIGNBOOK_DIST}/sections/[section-id]/spec.section.yml` with this exact format:

```yaml
id: section-id-kebab-case
title: Section Title
description: 2-3 sentence description of the section's purpose and scope
status: planned
shell: true

user_flows:
  - title: Flow 1 title
    steps: Browse listings → Select item → View detail → Take action
  - title: Flow 2 title
    steps: Description of another user flow

ui_requirements:
  - Requirement 1: specific UI element or pattern needed
  - Requirement 2
```

Create the directory `${DESIGNBOOK_DIST}/sections/[section-id]/` if it doesn't exist.

## Step 6: Confirm Completion

> "I've saved the section specification to `${DESIGNBOOK_DIST}/sections/[section-id]/spec.section.yml`.
>
> **[Section Title]:**
> - User Flows: [N] defined
> - UI Requirements: [N] defined
> - Shell: [Inside shell / Standalone]
>
> Open Storybook to see the specification on the Sections page. You can run `/debo-shape-section` again to shape the next section or update this one."

**Guardrails**
- Be conversational — help the user think through requirements
- Keep specs focused on *what* the section needs, not *how* to implement it
- Reference the data model entities when discussing what information to display
- Reference the shell specification when discussing layout and navigation
- Reference design tokens when discussing visual design decisions
- Each user flow should describe a complete path (start → action → result)
- UI requirements should be specific enough to guide design but not prescribe exact implementations
- The markdown format must match exactly for Storybook to parse it
- Section IDs must match the kebab-case conversion consistently
