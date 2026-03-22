---
name: /debo-design-screen
id: debo-design-screen
category: Designbook
description: Create screen design components for a section
workflow:
  title: Design Screen
  stages: [designbook-design-screen:intake, create-component, plan-entities, create-sample-data, map-entity, create-section-scene]
before:
  - workflow: /debo-css-generate
    execute: if-never-run
---

Load skill `designbook-workflow` and execute the workflow stages defined in the frontmatter above.
