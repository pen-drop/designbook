---
title: Design Entity
description: Create or change one entity view or form mode. Use for entity mappings, sample data for a mode, or its standalone preview.
params:
  entity_type:
    type: string
    default: ''
  bundle:
    type: string
    default: ''
  view_mode:
    type: string
    default: ''
  form_mode:
    type: string
    default: ''
  reference_url:
    type: string
    default: ''
  reference_folder:
    type: string
  selector:
    type: string
    default: ''
  breakpoints:
    type: array
    default: []
stages:
  reference:
    steps:
      - extract-reference
  component:
    steps:
      - write-component
  sample-data:
    steps:
      - create-sample-data
  entity-mapping:
    steps:
      - map-entity
  consumers:
    steps:
      - create-scene-file
      - write-scene
  validate:
    steps:
      - validate
---

Creation/change building blocks: intake selects only necessary writes and absent-file initialization. Reference analysis is completed before execution. Include explicit prerequisite builds/index refreshes and final build/browser checks for all affected targets. Template for the planning agent. Use the ordered steps as building blocks. Enumerate repeated targets during intake and write each concrete task explicitly; these stages do not execute or expand at runtime.
