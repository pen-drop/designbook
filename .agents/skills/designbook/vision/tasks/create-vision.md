---
when:
  steps: [create-vision]
reads:
  - path: $DESIGNBOOK_DATA/vision.md
    optional: true
result:
  vision:
    path: $DESIGNBOOK_DATA/vision.md
    type: object
    required: [product_name, description]
    properties:
      product_name: { type: string, title: Product Name }
      description: { type: string, title: Description }
      problems:
        type: array
        title: Problems & Solutions
        default: []
        items:
          type: object
          properties:
            title: { type: string }
            solution: { type: string }
      features:
        type: array
        title: Key Features
        default: []
        items: { type: string }
      design_reference:
        type: object
        title: Design Reference
        default: null
        properties:
          type: { type: string }
          url: { type: string }
          label: { type: string }
      references:
        type: array
        title: References
        default: []
        items:
          type: object
          properties:
            type: { type: string }
            url: { type: string }
            label: { type: string }
---

# Product Vision

Define the product vision through dialog. Extract fields from the user's message.
If all required fields are present, no questions needed.
If fields are missing, ask for all missing in a single question.

## Gathering

Extract these fields from the user's message:
- **Product name** — always required before proceeding
- **Description** (1-3 sentences)
- **Problems & Solutions** (1-5 pairs)
- **Key Features** (bulleted list)
- **Design reference** (optional) — Primary design source: website URL, image, or integration-specific (e.g. a design tool). Includes type, URL, and label.
- **References** (optional) — Additional sources the AI should consult: URLs to design systems, local folders with specs or assets, or any other location with relevant context.

## Constraints

- The `# Product Name` heading is required — Storybook parses this as the product title
- If vision.md exists, use as starting point
- Minimize conversation rounds — gather all missing info at once
- Design Reference and References are optional — only if user provides them
- Reference types are extensible — integration skills (e.g. stitch) can add their own types
- Folder references use `path:` instead of `url:` to point to local directories
