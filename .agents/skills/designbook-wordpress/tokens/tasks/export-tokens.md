---
title: Export tokens to theme.json
trigger:
  steps: [export-tokens]
filter:
  backend: wordpress
params:
  type: object
  required: [design_tokens]
  properties:
    design_tokens:
      path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
      workflow: tokens
      type: object
result:
  type: object
  required: [theme-json]
  properties:
    theme-json:
      path: $DESIGNBOOK_HOME/theme.json
      $ref: ../schemas.yml#/ThemeJson
---

# Export tokens to theme.json

Write the theme's `theme.json` so every color, font-family, font-size and spacing token of
the design tokens is available as a WordPress preset.
