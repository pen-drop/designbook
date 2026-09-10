---
title: Example
description: Three-stage example used to test the plan command.
params:
  scene_id:
    type: string
    default: example:scene
  reference_url:
    type: string
    default: ""
stages:
  reference:
    steps: [extract]
  intake:
    steps: [intake]
  polish:
    steps: [polish]
engine: direct
---
