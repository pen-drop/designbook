---
title: Design Entity
description: Build one entity view-mode (mapping + sample data) and preview it standalone
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
      - create-component
  sample-data:
    steps:
      - create-sample-data
  entity-mapping:
    steps:
      - map-entity
---

Template for the planning agent. Use the ordered steps as building blocks. Enumerate repeated targets during intake and write each concrete task explicitly; these stages do not execute or expand at runtime.
