---
name: designbook:design:outtake--sync-verify
title: "Outtake: Sync Verify"
trigger:
  steps: [sync-verify:outtake]
priority: 50
params:
  type: object
  required: [story_id]
  properties:
    story_id:
      $ref: ../../scenes/schemas.yml#/StoryId
result:
  type: object
  required: [score-report]
  properties:
    score-report: { $ref: ../schemas.yml#/ScoreReport }
---

# Check report

Assemble the declared report from this check's comparison results, supplied through explicit
predecessor input references. This run contains no correction pass: `first_shot` and `final`
are the same measurement and `delta` is zero. Preserve every issue and check result.

Completion: the report covers every declared capture/check. The intake owns the later repair
handoff; this task produces only its declared report.
