---
title: Design Shell
description: Design the application shell — page component with header, content, and footer slots
stages:
  intake:
    steps: [intake]
  component:
    steps: [create-component]
  scene:
    steps: [create-scene]
  setup-compare:
    steps: [setup-compare]
  capture:
    steps: [capture]
  compare:
    steps: [compare]
  triage:
    steps: [triage]
  polish:
    steps: [polish]
  outtake:
    steps: [outtake]
engine: direct
before:
  - workflow: css-generate
    execute: if-never-run
---
