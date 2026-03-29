---
files: []
---

# Intake: Product Vision

Extract the product vision from the user's input. Result goes to `${DESIGNBOOK_DATA}/product/vision.md`.

Extract these fields from the user's message:
- **Product name**
- **Description** (1-3 sentences)
- **Problems & Solutions** (1-5 pairs)
- **Key Features** (bulleted list)

If the user's message already contains all four fields, proceed immediately to the create-vision stage without asking questions.

If any field is missing, ask for the missing fields only — in a single question. Once all fields are gathered, proceed to create-vision.

**Constraints**
- Always ensure the product has a name before proceeding
- Minimize conversation rounds — gather all missing info at once
