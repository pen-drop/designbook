---
name: /debo-design-tokens
id: debo-design-tokens
category: Designbook
description: Choose colors and typography for your product
workflow:
  title: Design Tokens
  stages: [designbook-tokens:intake, create-tokens]
after:
  - workflow: /debo-css-generate
    optional: true
---

Load skill `designbook-workflow` and execute the workflow stages defined in the frontmatter above.
