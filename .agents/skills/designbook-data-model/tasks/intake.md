---
files: []
reads:
  - path: $DESIGNBOOK_DIST/product/vision.md
    workflow: /debo-vision
  - path: $DESIGNBOOK_DIST/data-model.yml
    optional: true
---

# Intake: Data Model

Help the user define the core data model through conversation. The result is saved to `${DESIGNBOOK_DIST}/data-model.yml`.

> **Spec Mode (`--spec`):** Output a YAML plan showing what WOULD be created instead of writing files.

## Step 1: Propose and Discuss

Analyze the product vision. Propose entity types, bundles, and fields:

> "Based on your product vision, I suggest the following data model:
>
> **[Entity Type]**
> - `[bundle]` — [description]
>   - `[field]` ([type]): [purpose]
>
> Does this match what you need? Anything to add, change, or remove?"

Iterate until the user approves. Keep the conversation focused — avoid technical schema details unless the user asks.

## Step 2: Check for referenced entities

Calculate referenced entity types like media and provide them also to the user.

## Step 3: Present Final Model

Show the complete approved structure once more before saving:

> "Here's the final data model:
> [summary table or YAML preview]
>
> Ready to save?"

Once confirmed, the `create-data-model` stage runs automatically.
