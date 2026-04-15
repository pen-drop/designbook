---
title: Design Verify
description: Visual testing -- verify screens or components against design references
params:
  story_id:
    type: string
    resolve: story_id
  scene_id: { type: string, default: "" }
  component_id: { type: string, default: "" }
  reference_url: { type: string, default: "" }
  reference_folder:
    type: string
    resolve: reference_folder
    from: reference_url
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
