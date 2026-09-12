---
title: Design Component
description: Create or change a UI component. Explicit invocation only; incidental component mentions do not trigger this skill.
params:
  component_id:
    type: string
  reference_url:
    type: string
    default: ''
  reference_folder:
    type: string
  breakpoints:
    type: string
  components:
    type: array
    items:
      $ref: ../../../design/schemas.yml#/Component
stages:
  component:
    steps:
      - write-component
  component-index:
    steps:
      - refresh-components
  consumers:
    steps:
      - create-sample-data
      - map-entity
      - create-scene-file
      - write-scene
  validate:
    steps:
      - validate
---

Creation/change building blocks: intake selects only necessary writes and absent-file initialization. Reference analysis is completed before execution. Include explicit prerequisite builds/index refreshes and final build/browser checks for all affected targets. Template for the planning agent. Use the ordered steps as building blocks. Enumerate repeated targets during intake and write each concrete task explicitly; these stages do not execute or expand at runtime.
