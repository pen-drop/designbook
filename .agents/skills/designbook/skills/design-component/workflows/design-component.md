---
title: Design Component
description: Create a new UI component from a design reference
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
      - create-component
---

Template for the planning agent. Use the ordered steps as building blocks. Enumerate repeated targets during intake and write each concrete task explicitly; these stages do not execute or expand at runtime.
