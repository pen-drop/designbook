---
title: Design Verify
description: Compare completed source and actual observation revisions using explicit correspondences
params:
  story_id:
    type: string
stages:
  compare:
    steps: [compare-observations]
  triage:
    steps: [triage]
  outtake:
    steps: [outtake]
---

Source and actual captures are completed before this comparison definition is
created. Enumerate each subject/view/state correspondence explicitly. Comparison
consumes published observations and images without capture or metadata writes.
