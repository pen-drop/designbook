---
when:
  stages: [create-vision]
---

- The `# [Product Name]` heading at the top is required — Storybook parses this as the product title
- Create the directory `${DESIGNBOOK_OUTPUTS_CONFIG}/product/` if it doesn't exist
- Problems & Solutions: 1–5 entries, each as a `### Problem N:` heading
- Key Features: bulleted list
- Always ensure the product has a name — if not provided during dialog, do not proceed
- If `${DESIGNBOOK_OUTPUTS_CONFIG}/product/vision.md` already exists, read it first before writing
