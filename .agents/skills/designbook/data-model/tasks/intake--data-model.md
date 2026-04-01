---
files: []
reads:
  - path: $DESIGNBOOK_DATA/product/vision.md
    workflow: /debo-vision
  - path: $DESIGNBOOK_DATA/data-model.yml
    optional: true
---

# Intake: Data Model

Help the user define the core data model through conversation. The result is saved to `${DESIGNBOOK_DATA}/data-model.yml`.

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

**Purpose assignment:** For each bundle, infer its semantic purpose from the name and description. Assign a `purpose` value when the bundle has a clear role. Known purposes from active extension rules:

- `landing-page` — a page assembled via Layout Builder or Canvas (suggest when bundle name implies a landing/home/campaign page)

When assigning purpose, check active extension rules for their purpose-conditional logic and set the appropriate `view_modes.full.template` accordingly. If no extension is active or the purpose doesn't match any rule, default view_modes to `template: field-map`.

## Step 2: Check for referenced entities

Calculate referenced entity types like media and provide them also to the user.

## Step 3: Present Final Model

Show the complete approved structure once more before saving:

> "Here's the final data model:
> [summary table or YAML preview]
>
> Ready to save?"

Once confirmed, the `create-data-model` stage runs automatically.
