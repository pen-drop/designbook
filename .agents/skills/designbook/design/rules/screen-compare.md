---
name: designbook:design:screen-compare
trigger:
  steps: [compare]
---

# Screen Compare

Hard constraints for screenshot-based screen comparison. Applies both to the
regular compare stages used by design verification and final workflow review.
All browser interaction uses `playwright-cli`.

## Preconditions

Use the task-provided values only:

- `story_url` — pre-resolved iframe URL for the story under review
- `reference_folder` — resolved folder that contains `extract.json` and any
  reference screenshots
- `check` when present — provides `story_id`, `breakpoint`, `region`,
  `selector`, and threshold context for the compare stage
- `breakpoints[]` and `regions[]` when present — the requested review surface

If `story_url` or `reference_folder` is empty, skip the compare and emit a
non-passing compare artifact instead of fabricating a result.

## Capture And Compare Pass

When the values are present, the stage MUST do all of the following:

1. Open the Storybook story with Playwright.
2. Resolve the viewport width from the active breakpoint context.
3. Wait for the story render to settle before capturing.
4. Capture the story screenshot:
   - full-page for `full` or empty selector
   - element-specific capture for named regions/selectors
5. Compare the captured screenshot against the reference screenshot in
   `reference_folder`.
6. Save the resulting compare artifact.

For the compare stage:
- emit actionable `issues`
- emit one compare artifact for the active check
- save any diff/report file needed by that artifact

## Structural Dimension Drift

Before interpreting pixel diff quality, compare the reference screenshot dimensions with the Storybook screenshot dimensions for the same breakpoint and region.

When width or height differs enough to indicate missing or extra structure, emit an issue that names the dimension drift and treat it as a structural mismatch. Continue writing the normal diff artifact when possible, but do not let screenshot resizing hide missing landmark regions.

## Severity Is Mapped From Measurements, Not Judgement

Issue severity MUST be derived from the measured numbers, not from a subjective impression. Self-graded severity drifts toward leniency — a footer that is 38% too short is not "minor". Apply these floors (take the highest that matches):

- `diff_percent > 0.25`, **or** width/height drift `> 25%` → at least `critical`.
- `diff_percent > 0.10`, **or** width/height drift `> 10%` → at least `major`.
- otherwise → `minor`.

A region with a missing or extra landmark is `critical` regardless of pixel diff. These are floors: raise severity when the deviation is clearly worse, never lower it below the measured band. The outtake's `success_rate` must be consistent with the worst check — it cannot exceed `1 − max(diff_percent)` across all checks.

## Playwright Execution Rules

- Reuse one Playwright session per compare pass when possible.
- Use the same viewport sizing discipline as capture/compare stages.
- Wait for the story render to settle before capturing.
- If Storybook needs a restart after same-run component creation, restart it
  before the final compare instead of accepting a broken render.

## Output Discipline

- Compare results must be based on an actual screenshot comparison, not only a
  prose judgment.
- Each compare task must emit one compare artifact entry alongside its issues.
- Missing compare artifacts reduce confidence and must be reflected in the
  emitted artifact and later outtake scoring.
