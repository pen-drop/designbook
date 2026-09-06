---
title: Design Verify
description: Measure existing scenes against the design reference and report the complete issue list
params:
  story_id:
    type: string
  reference_url:
    type: string
    default: ''
  reference_dir:
    type: string
stages:
  setup-compare:
    steps:
      - setup-compare
  reference:
    steps:
      - ensure-baseline
  capture:
    steps:
      - capture
  compare:
    steps:
      - compare
  triage:
    steps:
      - triage
  outtake:
    steps:
      - outtake
---

Template for the planning agent. Use the ordered steps as building blocks. Enumerate repeated targets during intake and write each concrete task explicitly; these stages do not execute or expand at runtime.
