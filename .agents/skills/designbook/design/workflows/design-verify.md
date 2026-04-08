---
title: Design Verify
description: Visual testing — verify existing screens against design references
params:
  scene: ~
  reference: []
stages:
  intake:
    steps: [design-verify:intake]
  test:
    each: checks
    steps: [capture, compare]
  polish:
    each: checks
    steps: [polish, recapture, verify]
  outtake:
    steps: [design-verify:outtake]
engine: direct
---
