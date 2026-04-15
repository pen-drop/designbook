---
title: Design Screen
description: Create screen design components for a section (one scene per run)
params:
  story_id:
    type: string
    resolve: story_id
    sources: [scenes]
  scene_id: { type: string }
  reference_url: { type: string, default: "" }
  reference_folder:
    type: string
    resolve: reference_folder
    from: reference_url
  breakpoints:
    type: string
    resolve: breakpoints
stages:
  reference:
    steps: [extract-reference]
  intake:
    steps: [intake]
    domain: [data-model]
  component:
    steps: [create-component]
  sample-data:
    steps: [create-sample-data]
  entity-mapping:
    steps: [map-entity]
  scene:
    steps: [create-scene]
    domain: [data-model]
engine: direct
before:
  - workflow: css-generate
    execute: if-never-run
after:
  - workflow: design-verify
---
