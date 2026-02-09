---
name: /data-model
id: data-model
category: Designbook
description: Define your data model through a guided conversation
---

Help the user define the core data model for their product. This establishes the "nouns" of the system — the entities and their relationships. The result is saved to `designbook/data-model/data-model.md`.

**Steps**

## Step 1: Check Prerequisites

First, check if the following files exist:
- `designbook/product/product-overview.md` — the product vision
- `designbook/product/product-roadmap.md` — the product roadmap

**If no product vision exists**, tell the user:

> "Before defining your data model, you'll need to establish your product vision. Please run `/product-vision` first, then `/product-roadmap` to define your sections."

Stop here.

**If product vision exists**, read it (and the roadmap if available) to understand the product context. Proceed to Step 2.

## Step 2: Gather Initial Input

Review the product overview and roadmap, then present your initial analysis:

> "Based on your product vision for **[Product Name]** and your roadmap sections, I can see you're building [brief summary].
>
> Let me help you define the core data model — the main "things" your app will work with.
>
> Looking at your product, here are some entities I'm seeing:
>
> - **[Entity 1]** — [Brief description based on product overview]
> - **[Entity 2]** — [Brief description based on sections]
> - **[Entity 3]** — [Brief description]
>
> Does this capture the main things your app works with? What would you add, remove, or change?"

Wait for their response before proceeding.

## Step 3: Refine Entities and Relationships

Ask clarifying questions to refine the model:

- "Are there any other core entities in your system that users will create, view, or manage?"
- "For [Entity], what does it represent in your system?"
- "How do these entities relate to each other? For example, does a [Entity1] have many [Entity2]?"

Keep the conversation focused on:
- **Entity names** — What are the main nouns? (Use singular: User, not Users)
- **Plain-language descriptions** — What does each entity represent?
- **Relationships** — How do entities connect to each other?

**Important:** Do NOT define every field or database schema details. Keep it minimal and conceptual.

## Step 4: Present Draft and Refine

Once you have enough information, present a draft:

> "Here's your data model:
>
> **Entities:**
>
> - **[Entity1]** — [Description]
> - **[Entity2]** — [Description]
>
> **Relationships:**
>
> - [Entity1] has many [Entity2]
> - [Entity2] belongs to [Entity1]
>
> Does this look right? Any adjustments?"

Iterate until the user is satisfied.

## Step 5: Save the File

Once the user approves, create the file at `designbook/data-model/data-model.md` with this exact format:

```markdown
# Data Model

## Entities

### [EntityName]
[Plain-language description of what this entity represents and its purpose in the system.]

### [AnotherEntity]
[Plain-language description.]

## Relationships

- [Entity1] has many [Entity2]
- [Entity2] belongs to [Entity1]
- [Entity3] belongs to both [Entity1] and [Entity2]
```

**Important:**
- Entity names should be singular (User, not Users; Project, not Projects)
- Keep descriptions minimal — focus on what each entity represents, not every field
- Relationships should describe how entities connect conceptually
- Use plain language that a non-technical person could understand

Create the directory `designbook/data-model/` if it doesn't exist.

## Step 6: Confirm Completion

Let the user know:

> "I've saved your data model to `designbook/data-model/data-model.md`.
>
> **Entities defined:**
> - [List entities]
>
> **Relationships:**
> - [List key relationships]
>
> Open Storybook to see the data model displayed on the Data Model page. You can run `/data-model` again anytime to update it."

**Guardrails**
- Be conversational and helpful, not robotic
- Ask follow-up questions when answers are vague
- Keep the data model minimal — entity names, descriptions, and relationships
- Do NOT define detailed schemas, field types, or validation rules
- Use plain language that a non-technical person could understand
- Entity names should be singular
- The markdown format must match exactly for Storybook to parse it
- If `designbook/data-model/data-model.md` already exists, read it first and tell the user: "You already have a data model defined. Would you like to update it or start fresh?"
