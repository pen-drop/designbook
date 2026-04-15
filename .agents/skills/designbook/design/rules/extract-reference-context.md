---
name: designbook:design:extract-reference-context
when:
  steps: [intake]
---

# Extract Reference Context

When `reference_folder` is available as a workflow param and `extract.json` exists in that directory, read it and use the extracted design data as context for the intake.

## Execution

1. Check if `reference_folder` is set (non-empty) in the workflow params.
2. If set, check if `{reference_folder}/extract.json` exists.
3. If it exists, read it and use the extracted design reference data (tokens, fonts, colors, spacing, landmarks) as context when making intake decisions.

This data was produced by the `extract-reference` stage and contains:
- Semantic color tokens (primary, secondary, accent, surface, etc.)
- Typography (fonts, sizes, weights)
- Spacing rhythm (base unit, common values)
- Border radii tokens
- Landmark descriptions (header, footer, hero, etc.)
- Full-page and region screenshots

Use this context to make informed decisions about component structure, token usage, and design alignment during intake.
