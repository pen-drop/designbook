---
name: designbook:design:outtake--design-verify
title: "Outtake: Design Verify"
trigger:
  steps: [design-verify:outtake]
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

# Outtake — Design Verify

Assemble the `ScoreReport` from this workflow's own measurements and submit it
as the task result.

## Result: score-report

Both measurements come from the workflow's task results in scope — no params are
passed in for them:

- `first_shot` is the `VerifyResult` sourced from the `compare` stage results
  (the first measurement, before any fix pass).
- `final` is the `VerifyResult` sourced from the `re-compare` stage results
  (the second measurement, after the fix pass).

When the `compare` stage scored 0 (no issues), the fix pass and re-measurement
stages produce no change — `final` equals `first_shot`.

See `schemas.yml#/ScoreReport` and `schemas.yml#/VerifyResult` for field
semantics (delta, tokens, per-check breakdown).
