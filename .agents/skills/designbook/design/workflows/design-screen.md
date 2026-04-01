---
title: Design Screen
description: Create screen design components for a section
stages:
  intake:
    steps: [intake]
  component:
    each: component
    steps: [create-component]
  sample-data:
    steps: [create-sample-data]
  entity-mapping:
    steps: [design-screen:map-entity]
  scene:
    each: scene
    steps: [design-screen:create-scene]
  test:
    each: scene
    steps: [storybook-preview, screenshot, resolve-reference, visual-compare, polish]
engine: direct
before:
  - workflow: css-generate
    execute: if-never-run
---
