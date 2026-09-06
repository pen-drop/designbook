---
title: Design Screen
description: Create or change one named section screen. Use for screen composition, section scenes, or their supporting components.
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
  component:
    steps:
      - write-component
  sample-data:
    steps:
      - create-sample-data
  entity-mapping:
    steps:
      - map-entity
  scene:
    steps:
      - create-scene-file
      - write-scene
    domain:
      - data-model
---

Creation/change building blocks: intake selects only necessary writes and absent-file initialization. Reference analysis is completed before execution. Include explicit prerequisite builds/index refreshes and final build/browser checks for all affected targets. Template for the planning agent. Use the ordered steps as building blocks. Enumerate repeated targets during intake and write each concrete task explicitly; these stages do not execute or expand at runtime.
