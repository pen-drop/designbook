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

Guide the user through choosing colors, typography, and additional token groups. Result is W3C Design Token YAML.

Use `extract` param (`fonts`, `colors`, `tokens` fields) as the starting point. Fall back to vision context and user input if the extract is unavailable.

Present choices to the user, let them confirm or adjust, and summarize all tokens before saving.

Follow the `merged_schema` for required token structure — blueprints extend the schema with component-level token groups. Read the css-naming blueprint from `task.blueprints[]` filtered by `type: css-naming` for token group names and CSS variable mapping. Apply renderer hints per the `renderer-hints` rule.

## Result: design-tokens

Three fixed levels per schema: `primitive` → `semantic` → `component`. Each leaf is a `TokenLeaf` with `$value` and `$type`.
