---
when:
  steps: [vision:intake]
files: []
reads:
  - path: $DESIGNBOOK_DATA/vision.md
    optional: true
---

# Intake: Product Vision

Extract the product vision from the user's input. Result goes to `${DESIGNBOOK_DATA}/vision.md`.

Extract these fields from the user's message:
- **Product name**
- **Description** (1-3 sentences)
- **Problems & Solutions** (1-5 pairs)
- **Key Features** (bulleted list)
- **Design reference** (optional) — Primary design source: website URL, image, or integration-specific (e.g. a design tool). Includes type, URL, and label.
- **References** (optional) — Additional sources the AI should consult: URLs to design systems, local folders with specs or assets, or any other location with relevant context.

If the user's message already contains all required fields, intake is complete — no questions needed.

If any field is missing, ask for the missing fields only — in a single question. Once all fields are gathered, intake is complete.

**Constraints**
- Always ensure the product has a name before proceeding
- Minimize conversation rounds — gather all missing info at once
- `design_reference` and `references` are optional — omit if the user doesn't provide them
- References can be URLs, local folder paths, or integration-specific identifiers
