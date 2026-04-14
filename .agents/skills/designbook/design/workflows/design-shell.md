---
title: Design Shell
description: Design the application shell -- page component with header, content, and footer slots
params:
  scene_id: { type: string, default: "design-system:shell" }
stages:
  reference:
    steps: [extract-reference]
  intake:
    steps: [intake]
  component:
    steps: [create-component]
  scene:
    steps: [create-scene]
engine: direct
before:
  - workflow: css-generate
    execute: if-never-run
after:
  - workflow: design-verify
---
