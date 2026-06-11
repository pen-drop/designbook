---
title: Design Verify
description: Visual testing — measure, fix once, re-measure against the design reference
params:
  story_id:
    type: string
    resolve: story_id
    sources: [scenes]
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
  re-capture:
    steps: [re-capture]
  re-compare:
    steps: [re-compare]
  outtake:
    steps: [outtake]
engine: direct
before:
  - workflow: css-generate
    execute: always
---

Always regenerate CSS before measuring. Earlier stages (create-component,
create-scene) may have extended `design-tokens.yml` or introduced new utility
classes; without a fresh css-generate the Storybook iframe renders against stale
CSS — undefined token variables and unscanned utilities — so the compare would
score rendering artifacts, not the design. Hence `execute: always`, not
`if-never-run`.

The flow is measure → fix once → re-measure. The `compare` stage yields the
first-shot measurement; `triage`/`polish` apply a single fix pass; the
`re-capture`/`re-compare` stages re-measure to yield the final measurement.
Distinct `re-capture`/`re-compare` step names (rather than repeating `capture`/`compare`)
keep each measurement's tasks unambiguous within the single workflow.
