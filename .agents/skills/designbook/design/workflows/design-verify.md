---
title: Design Verify
description: Visual testing -- verify screens or components against design references
params:
  scene_id: { type: string }
  component_id: { type: string }
stages:
  reference:
    steps: [extract-reference]
  intake:
    steps: [intake]
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
---
