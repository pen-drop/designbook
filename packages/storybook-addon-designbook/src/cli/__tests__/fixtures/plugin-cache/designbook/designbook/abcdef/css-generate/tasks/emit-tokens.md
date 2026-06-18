---
trigger:
  steps: [css-generate:emit-tokens]
result:
  type: object
  properties:
    tokens:
      $ref: designbook-css-tailwind/css-tokens/schemas.yml#/TokenSet
---

Emit CSS tokens. The result schema references a sibling skill's content root.
