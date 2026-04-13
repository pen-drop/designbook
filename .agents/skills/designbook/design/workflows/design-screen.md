---
title: Design Screen
description: Create screen design components for a section
stages:
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
  setup-compare:
    steps: [setup-compare]
  capture:
    steps: [capture]
  compare:
    steps: [compare]
  outtake:
    steps: [outtake]
engine: direct
before:
  - workflow: css-generate
    execute: if-never-run
---
