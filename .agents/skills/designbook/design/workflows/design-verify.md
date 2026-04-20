---
title: Design Verify
description: Visual testing -- verify screens or components against design references
params:
  story_id:
    type: string
    resolve: story_id
    sources: [scenes]
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
