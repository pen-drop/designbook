---
title: Design Screen
description: Create screen design components for a section
stages:
  execute:
    steps: [design-screen:intake, create-component, create-sample-data, design-screen:map-entity, design-screen:create-scene]
  test:
    steps: [screenshot, resolve-reference, visual-compare, polish]
engine: direct
before:
  - workflow: css-generate
    execute: if-never-run
---
