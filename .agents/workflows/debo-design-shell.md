---
name: /debo-design-shell
id: debo-design-shell
category: Designbook
description: Design the application shell — page component with header, content, and footer slots
workflow:
  title: Design Shell
  stages: [designbook-design-shell:intake, create-component, create-shell-scene]
before:
  - workflow: /debo-css-generate
    execute: if-never-run
---

Load skill `designbook-workflow` and execute the workflow stages defined in the frontmatter above.
