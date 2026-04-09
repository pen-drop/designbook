---
title: Design Verify
description: Visual testing — verify existing screens against design references
params:
  scene: ~
  reference: []
stages:
  intake:
    steps: [design-verify:intake]
  capture:
    each: checks
    steps: [capture]
  compare:
    each: checks
    steps: [compare]
  triage:
    steps: [design-verify:triage]
  polish:
    each: issues
    steps: [polish]
  outtake:
    steps: [design-verify:outtake]
engine: direct
---
