---
title: Design Shell
description: Create or change the application shell. Use for shared header, footer, navigation, or shell content injection.
params:
  section:
    type: object
    default:
      id: shell
      group: Designbook/Design System
      title: Shell
      status: planned
  scene_id:
    type: string
    default: design-system:shell
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
    default: []
  regions:
    type: array
    default:
      - header
      - footer
stages:
  component:
    steps:
      - write-component
  consumers:
    steps:
      - create-sample-data
      - map-entity
  scene:
    steps:
      - create-scene-file
      - write-scene
  validate:
    steps:
      - validate
---

Creation/change building blocks: intake selects only necessary writes and absent-file initialization. Reference analysis is completed before execution. Include explicit prerequisite builds/index refreshes and final build/browser checks for all affected targets. Template for the planning agent. Use the ordered steps as building blocks. Enumerate repeated targets during intake and write each concrete task explicitly; these stages do not execute or expand at runtime.
