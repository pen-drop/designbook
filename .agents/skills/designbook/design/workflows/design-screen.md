---
title: Design Screen
description: Create screen design components for a section
stages:
  component:
    each: component
    steps: [create-component]
  execute:
    steps: [create-sample-data, design-screen:map-entity]
  scene:
    each: scene
    steps: [design-screen:create-scene]
  test:
    each: scene
    steps: [screenshot, resolve-reference, visual-compare, polish]
engine: direct
before:
  - workflow: css-generate
    execute: if-never-run
---
