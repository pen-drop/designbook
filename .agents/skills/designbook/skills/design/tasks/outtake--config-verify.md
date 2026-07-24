---
name: designbook:design:outtake--config-verify
title: "Outtake: Config Verify"
trigger:
  steps: [config-verify:outtake]
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

# Outtake — Config Verify

Assemble the `ScoreReport` from this workflow's own measurements and submit it as the task
result. Both measurements come from this workflow's task results in scope — no params are
passed in for them:

- `first_shot` is the `VerifyResult` sourced from the `compare` stage results (the backend
  render measured against the frozen Storybook baseline, before any fix pass).
- `final` is the `VerifyResult` sourced from the `re-compare` stage results (after the single
  config fix pass).

When the `compare` stage scored 0 (backend already matches Storybook within threshold), the
fix and re-measurement stages produce no change — `final` equals `first_shot`.

See `schemas.yml#/ScoreReport` and `schemas.yml#/VerifyResult` for field semantics (delta,
tokens, per-check breakdown).
