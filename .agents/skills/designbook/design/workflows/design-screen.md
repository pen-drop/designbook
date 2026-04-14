---
title: Design Screen
description: Create screen design components for a section (one scene per run)
params:
  scene_id: { type: string }
stages:
  reference:
    steps: [extract-reference]
  intake:
    steps: [intake]
  component:
    steps: [create-component]
  sample-data:
    steps: [create-sample-data]
  entity-mapping:
    steps: [map-entity]
  scene:
    steps: [create-scene]
engine: direct
before:
  - workflow: css-generate
    execute: if-never-run
after:
  - workflow: design-verify
---
