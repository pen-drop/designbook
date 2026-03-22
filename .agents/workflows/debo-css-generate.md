---
name: /debo-css-generate
id: debo-css-generate
category: Designbook
description: Generate CSS token files from design tokens. Automatically selects the correct skill based on DESIGNBOOK_FRAMEWORK_CSS.
workflow:
  title: Generate CSS
  stages: [designbook-css-generate:intake, generate-jsonata, generate-css]
---

Load skill `designbook-workflow` and execute the workflow stages defined in the frontmatter above.
