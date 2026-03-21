---
files: []
reads:
  - path: $DESIGNBOOK_DIST/product/vision.md
    workflow: /debo-vision
  - path: $DESIGNBOOK_DIST/sections
    optional: true
---

# Intake: Sections

Help the user create or update their product sections. The sections break the product vision into 3–5 development areas. The result feeds the `create-sections` stage.

## Step 1: Analyze and Propose Sections

Analyze the vision:
- The name and core description
- The problems being solved
- The key features listed

Based on this analysis, propose 3–5 sections that represent:
- **Main areas** of the product
- **Logical build order** — what to build first, what depends on what
- **Self-contained feature areas** — each can be designed and built independently

Present the proposal:

> "Based on your product vision for **[Vision Name]**, I'd suggest breaking this into these development sections:
>
> 1. **[Section Title]** — [One sentence description]
> 2. **[Section Title]** — [One sentence description]
> 3. **[Section Title]** — [One sentence description]
>
> These are ordered by development priority. The first section covers the core functionality, with each subsequent section building on it.
>
> Does this breakdown make sense? Would you like to adjust any sections or their order?"

## Step 2: Refine with User

Iterate on the sections based on user feedback. Ask clarifying questions as needed.

Keep iterating until the user approves. Once confirmed, the `create-sections` stage runs automatically.

**Guardrails**
- Always read the product vision first — the sections must align with it
- Be conversational and help the user think through the breakdown
- Keep sections self-contained — each should be designable and buildable independently
- 3–5 sections is the sweet spot — push back gently if the user wants too many or too few
