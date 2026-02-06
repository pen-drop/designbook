---
name: /product-roadmap
id: product-roadmap
category: Designbook
description: Define your product roadmap based on the product vision
---

Help the user create or update their product roadmap for Designbook. The roadmap breaks the product vision into 3–5 development sections. The result is saved to `designbook/product/product-roadmap.md`.

**Steps**

## Step 1: Check Current State

First, check if the following files exist:
- `designbook/product/product-overview.md` — the product vision
- `designbook/product/product-roadmap.md` — an existing roadmap

**If no product vision exists**, tell the user:

> "I don't see a product vision yet. The roadmap builds on your product vision — please run `/product-vision` first to define what you're building, then come back to `/product-roadmap`."

Stop here.

**If a roadmap already exists**, read both files and present the current state:

> "I see you already have a product roadmap with [N] sections:
>
> 1. **[Section 1]** — [Description]
> 2. **[Section 2]** — [Description]
>
> Would you like to:
> - **Update** — Add, remove, or reorder sections
> - **Start fresh** — Regenerate based on the current product vision"

Then proceed to Step 2 or re-enter the full flow based on their choice.

**If only product vision exists**, read it and proceed to Step 2.

## Step 2: Analyze and Propose Sections

Read `designbook/product/product-overview.md` and analyze:
- The product name and core description
- The problems being solved
- The key features listed

Based on this analysis, propose 3–5 sections that represent:
- **Main areas** of the product
- **Logical build order** — what to build first, what depends on what
- **Self-contained feature areas** — each can be designed and built independently

Present the proposal:

> "Based on your product vision for **[Product Name]**, I'd suggest breaking this into these development sections:
>
> 1. **[Section Title]** — [One sentence description]
> 2. **[Section Title]** — [One sentence description]
> 3. **[Section Title]** — [One sentence description]
>
> These are ordered by development priority. The first section covers the core functionality, with each subsequent section building on it.
>
> Does this breakdown make sense? Would you like to adjust any sections or their order?"

## Step 3: Refine with User

Iterate on the sections based on user feedback. Ask clarifying questions as needed:
- "Should [feature X] be its own section or part of [Section Y]?"
- "What would you consider the most critical section to build first?"
- "Are there any major areas I'm missing?"

Keep iterating until the user approves the sections.

## Step 4: Save the File

Once the user approves, create the file at `designbook/product/product-roadmap.md` with this exact format:

```markdown
# Product Roadmap

## Sections

### 1. [Section Title]
[One sentence description]

### 2. [Section Title]
[One sentence description]

### 3. [Section Title]
[One sentence description]
```

**Important:**
- The `### N. Title` format with numbered headings is required — this is what the Storybook display parses
- Keep descriptions to one sentence — concise and clear
- Order by development priority (most important first)
- 3–5 sections is ideal, avoid more than 5

Create the directory `designbook/product/` if it doesn't exist.

## Step 5: Confirm Completion

Let the user know:

> "I've saved your product roadmap to `designbook/product/product-roadmap.md`. Open Storybook to see the [N] development sections displayed below your product vision on the Product page.
>
> Your sections:
> 1. **[Section 1]** — [Description]
> 2. **[Section 2]** — [Description]
> 3. **[Section 3]** — [Description]
>
> **Next step:** You can now use these sections to plan your design and development work."

**Guardrails**
- Always read the product vision first — the roadmap must align with it
- If no product vision exists, redirect to `/product-vision` and stop
- Be conversational and help the user think through the breakdown
- Don't just list generic sections — make them specific to the user's product
- Keep sections self-contained — each should be designable and buildable independently
- The markdown format must match exactly for Storybook to parse it
- 3–5 sections is the sweet spot — push back gently if the user wants too many or too few
