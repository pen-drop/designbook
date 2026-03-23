---
files: []
---

# Intake: Product Vision

Help the user define their product vision. The result is saved to `${DESIGNBOOK_DIST}/product/vision.md`.

> **Spec Mode (`--spec`):** Output a YAML plan showing what WOULD be created instead of writing files.

## Fast Path

If the user's message already contains a product name, description, problems/solutions, AND features — skip all questions and proceed directly to the `create-vision` stage. Do not ask clarifying questions or present a draft for confirmation when all required information is already provided.

## Interactive Path

Only if key information is missing:

1. **Gather Input** — Ask what product they're building, what problems it solves, and who it's for
2. **Clarify Gaps** — Ask only for missing pieces: product name, description, problems, solutions, features. Ask all missing items in a single question batch.
3. **Confirm** — Present a brief summary and proceed once approved

**Constraints**
- Always ensure the product has a name before moving on
- Minimize back-and-forth — gather all missing info in one round if possible
