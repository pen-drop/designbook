---
title: Design Verify
description: Visual testing — verify existing screens against design references
params:
  reference: []
stages:
  intake:
    steps: [intake]
  setup-compare:
    steps: [setup-compare]
  capture:
    each: checks
    steps: [capture]
  compare-markup:
    each: checks
    steps: [compare-markup]
  compare:
    each: checks
    steps: [compare]
  triage:
    steps: [triage]
  polish:
    each: issues
    steps: [polish]
  outtake:
    steps: [outtake]
engine: direct
---
