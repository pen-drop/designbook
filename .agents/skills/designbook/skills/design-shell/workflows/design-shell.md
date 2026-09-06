---
title: Design Shell
description: Design the application shell -- page component with header, content, and footer slots
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
  reference:
    steps:
      - extract-reference
  component:
    steps:
      - create-component
  scene:
    steps:
      - create-scene-file
      - create-scene
  validate:
    steps:
      - validate
---

Template for the planning agent. Use the ordered steps as building blocks. Enumerate repeated targets during intake and write each concrete task explicitly; these stages do not execute or expand at runtime.
