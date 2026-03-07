---
name: /debo-data-model
id: debo-data-model
category: Designbook
description: Define your data model through a guided conversation
---

Help the user define the core data model for their product. This establishes the "nouns" of the system — the entities and their relationships. The result is saved to `${DESIGNBOOK_DIST}/data-model.yml` using the `designbook-data-model` skill.

**Steps**

## Step 1: Context & Prerequisites

Read the following files to understand the product:
- `${DESIGNBOOK_DIST}/product/product-overview.md`
- `${DESIGNBOOK_DIST}/product/product-roadmap.md`

Check if `${DESIGNBOOK_DIST}/data-model.yml` exists. If so, read it to understand the current model.

Check the `DESIGNBOOK_TECHNOLOGY` environment variable. 
- If it is `drupal`, **READ** `.agent/skills/designbook-data-model-drupal/SKILL.md` to understand Drupal-specific entity and field naming conventions. Be sure to apply these conventions in the next steps.

## Step 2: Gather Requirements

Analyze the product vision and existing model. Propose or refine the data model structure in terms of **Entity Types**, **Bundles**, and **Fields**.
- **Entity Types**: High-level categories (e.g., `node`, `user`, `taxonomy_term`).
- **Bundles**: Specific variations (e.g., `article` and `page` are bundles of `node`).
- **Fields**: Data attributes (e.g., `title`, `body`, `tags`).

Engage with the user to define these. Ask clarifying questions.
> "Based on your product vision, I suggest the following data model..."

## Step 3: Define JSON Structure

Construct a JSON object matching the `schema/data-model.yml` structure (Content -> Entity Type -> Bundle -> Fields).

Example structure:
```json
{
  "content": {
    "node": {
      "article": {
        "title": "Article",
        "description": "A news article or blog post.",
        "fields": {
          "title": { "type": "string", "label": "Title" },
          "body": { "type": "text", "label": "Body" }
        }
      }
    }
  }
}
```

Present the proposed structure to the user for approval.

## Step 4: Save Data Model

Once approved, follow these instructions to save the data:

1.  Write the JSON content to a temporary file `${DESIGNBOOK_TMP}/data-model-draft.json`.
2.  Run the `designbook-data-model` skill to validate and save it.

```bash
/skill/designbook-data-model/steps/process-data-model ${DESIGNBOOK_TMP}/data-model-draft.json
```

## Step 5: Confirmation

Confirm to the user that the data model has been updated and is visible in Storybook.
> "I've updated the data model. You can view it in the Storybook Data Model tab."
