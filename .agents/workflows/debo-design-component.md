---
name: /debo-design-component
id: debo-design-component
category: Designbook
description: Create a new UI component by gathering requirements interactively
workflow:
  title: Design Component
  stages: [designbook-design-component:intake, create-component]
before:
  - workflow: /debo-css-generate
    execute: if-never-run
---

Load skill `designbook-workflow` and execute the workflow stages defined in the frontmatter above.
