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
   `reference_folder` with the **measurement CLI** — do not eyeball the diff:
   ```
   npx storybook-addon-designbook compare-images \
     --reference <ref.png> --actual <story.png> --diff <out-diff.png>
   ```
   `--reference` is the comparison base. Pair story and reference by the full
   `(breakpoint, element, state)` triple — screenshot filenames follow
   `<bp>--<element>--<state>.png`, so a non-rest state never compares against the rest image.
   When `check.steps` are present, run them before capturing the story side so both
   sides are in the same interaction state. Take `diff_percent`, `diff_path`, and the
   issue `severity` from the CLI's JSON. The CLI does **not** emit `passed` — derive
   the artifact's `passed` deterministically as `diff_percent <= check.threshold` (the
   check's configured percentage threshold). A check with no reference (empty
   `story_url`/`reference_folder`) is `passed: false` with no `diff_percent`.
6. Save the resulting compare artifact, carrying the check's `state` plus the
   CLI's `diff_percent` and `severity` (outtake scores by severity, not pixel
   ratio alone, so both must reach the artifact).

For the compare stage:
- emit actionable `issues`
- emit one compare artifact per check (one per breakpoint × region × state)
- save any diff/report file needed by that artifact

## Structural Dimension Drift

Before interpreting pixel diff quality, compare the reference screenshot dimensions with the Storybook screenshot dimensions for the same breakpoint and region.

When width or height differs enough to indicate missing or extra structure, emit an issue that names the dimension drift and treat it as a structural mismatch. Continue writing the normal diff artifact when possible, but do not let screenshot resizing hide missing landmark regions.

## Severity Is Measured, Not Judged

Severity is **computed by `compare-images`, not assigned by you** — that is what
makes the score model-independent (same screenshots → same score). The CLI returns
a `severity` derived deterministically from the measured signals:

- pixel ratio `diff_percent` (odiff, antialiasing-aware),
- structural `dimension_drift` (per-axis size difference),
- spatial extent (rows touched — catches a small-percentage but widely-spread
  shift that pixel ratio alone undercounts).

Use the returned `severity` verbatim — both on each check's issue and on the
matching `compare_artifact`. A check whose severity is `pass` emits no issue (the
`Issue.severity` enum has no `pass` value); it still emits its `compare_artifact`
carrying `severity: pass`. Your prose describes *what* differs and *where* (so
polish can act); it must not raise or lower the measured severity. The outtake's
`success_rate` folds severity in: `1 − max(effective_deviation)` across all checks,
where `effective_deviation = max(diff_percent, severity_floor[severity])` (floors
`pass → 0.0`, `minor → 0.05`, `major → 0.20`, `critical → 0.50`) — so a widely-spread
shift that pixel ratio alone undercounts still costs at least its severity floor.
Measured, not authored. (The exact band thresholds live in the CLI and are
calibrated there; do not re-derive them here.)

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
