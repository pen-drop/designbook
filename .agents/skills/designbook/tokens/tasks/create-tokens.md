---
trigger:
  steps: [create-tokens]
domain: [tokens]
title: Create Design Tokens
params:
  type: object
  required: [reference_dir, vision]
  properties:
    reference_dir: { type: string }
    vision:
      path: $DESIGNBOOK_DATA/vision.yml
      workflow: /debo-vision
      type: object
    extract:
      path: "{reference_dir}/extract.json"
      $ref: ../../design/schemas.yml#/DesignReference
      type: object
    design_tokens:
      path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      type: object
result:
  type: object
  required: [design-tokens]
  properties:
    design_tokens:
      path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      $ref: ../schemas.yml#/DesignTokens
---

# Design Tokens

Derive a W3C Design Token YAML. When the `extract` param is present, it is the authoritative source — see the `extract-mapping` rule for value-origin constraints and completeness requirements. Fall back to vision or user input only when extract is missing and the workflow is interactive.

When the workflow runs interactively and extract is missing, guide the user through choosing colors, typography, and additional token groups; present choices, let them confirm or adjust, and summarize all tokens before saving.

Follow the `merged_schema` for required token structure — blueprints extend the schema with component-level token groups. Read the css-naming blueprint from `task.blueprints[]` filtered by `type: css-naming` for token group names and CSS variable mapping. Apply renderer hints per the `renderer-hints` rule.

## Result: design-tokens

Three fixed levels per schema: `primitive` → `semantic` → `component`. Each leaf is a `TokenLeaf` with `$value` and `$type`.

`semantic.color` and `semantic.typography` are required. When `extract` is present, every entry in `extract.typography[]` must be represented in `semantic.typography.*`, and every key in `extract.tokens.colors` must be present in `semantic.color.*`.
