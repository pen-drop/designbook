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
    steps: [map-entity]
  scene:
    each: scene
    steps: [create-scene]
  setup-compare:
    steps: [setup-compare]
  capture:
    each: checks
    steps: [capture]
  compare:
    each: checks
    steps: [compare]
  outtake:
    steps: [outtake]
engine: direct
before:
  - workflow: css-generate
    execute: if-never-run
---
