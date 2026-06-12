---
title: Design Screen
description: Create screen design components for a section (one scene per run)
params:
  story_id:
    type: string
    resolve: story_id
    sources: [scenes]
  scene_path:
    type: string
    resolve: scene_path
    from: story_id
  reference_url: { type: string, default: "" }
  reference_folder:
    type: string
    resolve: reference_folder
    from: reference_url
  breakpoints:
    type: array
    resolve: breakpoints
    from: story_id
stages:
  reference:
    steps: [extract-reference]
    isolate: true
  intake:
    steps: [intake]
    domain: [data-model]
  component:
    steps: [create-component]
    isolate: true
  sample-data:
    steps: [create-sample-data]
  entity-mapping:
    steps: [map-entity]
  scene:
    steps: [create-scene]
    domain: [data-model]
    isolate: true
engine: direct
before:
  - workflow: css-generate
    execute: if-never-run
after:
  - workflow: design-verify
    when: "reference_url != ''"
    params:
      story_id: story_id
---
