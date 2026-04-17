---
title: Design Shell
description: Design the application shell -- page component with header, content, and footer slots
params:
  scene_id: { type: string, default: "design-system:shell" }
  section_id: { type: string, default: "shell" }
  section_title: { type: string, default: "Shell" }
  reference_url: { type: string, default: "" }
  reference_folder:
    type: string
    resolve: reference_folder
    from: reference_url
  regions:
    type: string
    default: "header,footer"
stages:
  reference:
    steps: [extract-reference]
  intake:
    steps: [intake]
  component:
    steps: [create-component]
  scene:
    steps: [create-scene]  
  validate:
    steps: [validate]
engine: direct
before:
  - workflow: css-generate
    execute: if-never-run
after:
  - workflow: design-verify
---
