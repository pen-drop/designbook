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

Assemble the `ScoreReport` from this workflow's own measurements and surface it
as the workflow result.

## Result: score-report

Both measurements come from the workflow's task results in scope — no params are
passed in for them:

- `first_shot` is the `VerifyResult` for the `compare` stage (the first measurement,
  before any fix). Aggregate the `compare` stage's per-check `issues` and
  `compare_artifacts` into one `VerifyResult`: `score` is the severity sum
  (critical×3 + major×2 + minor×1) over all checks, with the per-check breakdown,
  pass/total counts, and pixel-diff figures alongside.
- `final` is the `VerifyResult` for the `re-compare` stage (the second measurement,
  after the single fix pass), aggregated the same way from the `re-compare` stage's
  results.

When the `compare` stage scored 0 (no issues), the `triage`/`polish` fix pass and
the `re-capture`/`re-compare` re-measurement produce no change — `final` equals
`first_shot`.

Then:

1. `delta = first_shot.score − final.score` (positive = the fix pass improved fidelity).
2. `tokens` = sum of `first_shot.tokens` and `final.tokens` per channel when present, else omit.
3. Display the compact score block:

```
## Design Verify — {story_id}

first_shot: {first_shot.score}   final: {final.score}   delta: {delta}
passed:     {final.passed}/{final.total}   avg diff: {final.avg_diff_percent}
```
