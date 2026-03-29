---
title: Design Screen
description: Create screen design components for a section
stages:
  execute:
    steps: [design-screen:intake, create-component, create-sample-data, design-screen:map-entity, design-screen:create-scene]
engine: direct
before:
  - workflow: css-generate
    execute: if-never-run
---
