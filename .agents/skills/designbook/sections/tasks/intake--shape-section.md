---
when:
  steps: [shape-section:intake]
files: []
reads:
  - path: $DESIGNBOOK_DATA/vision.md
---

# Intake: Shape Section

Help the user define a specification for one roadmap section. The result feeds the `create-section` stage and is saved to `${DESIGNBOOK_DATA}/sections/[section-id]/[section-id].section.scenes.yml`.

## Step 1: Select Section

Parse the sections from the product vision. Check which sections already have specs at `${DESIGNBOOK_DATA}/sections/[section-id]/*.section.scenes.yml`.

**Section ID conversion:** Convert the section title to kebab-case: lowercase, remove `&`, replace non-alphanumeric with `-`, trim dashes. Examples:
- "Homepage" → "homepage"
- "About & Team" → "about-team"

> "Here are your roadmap sections:
>
> 1. **[Section 1]** — [Description] ✓ (already specified) / ○ (not yet specified)
> 2. **[Section 2]** — [Description] ○
>
> Which section would you like to shape?"

If only one section is unspecified, auto-select it. If a section already has a spec, ask: "Update it or start fresh?"

Wait for their response.

## Step 2: Gather Section Requirements

Ask 4–6 clarifying questions based on the section context. Key areas:

- "What are the main user actions or tasks in this section?"
- "What information should be displayed? (Consider the data model entities: [list relevant entities])"
- "What are the key user flows? (e.g., browse → view detail → take action)"
- "What UI patterns fit best? (e.g., list view, grid, cards, detail page, form)"
- "What's in scope and what's explicitly out of scope?"
- "Should this section be wrapped in the application shell?"

Wait for their response.

## Step 3: Present Draft Specification

> "Here's the specification for **[Section Title]**:
>
> **Overview:** [2-3 sentence description]
>
> **User Flows:**
> - [Flow 1]
> - [Flow 2]
>
> **UI Requirements:**
> - [Requirement 1]
> - [Requirement 2]
>
> **Configuration:**
> - Shell: [true/false]
>
> Does this capture what you had in mind?"

Iterate until satisfied. Once confirmed, the `create-section` stage runs automatically.

**Guardrails**
- Be conversational — help the user think through requirements
- Keep specs focused on *what* the section needs, not *how* to implement it
- Reference the data model entities when discussing what information to display
- Each user flow should describe a complete path (start → action → result)
