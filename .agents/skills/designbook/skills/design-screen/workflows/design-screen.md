---
title: Design Screen
description: Create screen design components for a section (one scene per run)
params:
  story_id:
    type: string
  scene_path:
    type: string
  reference_url:
    type: string
    default: ''
  reference_folder:
    type: string
  breakpoints:
    type: array
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
  scene:
    steps:
      - create-scene
    domain:
      - data-model
---

Template for the planning agent. Use the ordered steps as building blocks. Enumerate repeated targets during intake and write each concrete task explicitly; these stages do not execute or expand at runtime.
