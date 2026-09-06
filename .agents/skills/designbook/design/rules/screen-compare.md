---
name: designbook:design:screen-compare
trigger:
  steps: [compare, re-compare]
---

# Screen Compare

Hard constraints for screenshot-based screen comparison. Applies both to the
regular compare stages used by design verification and final workflow review.
All browser interaction uses `playwright-cli`.

## Declared comparison inputs

Use the saved story screenshot, frozen baseline in `reference_dir`, and the task's
`screenshot` identity, threshold and declared diff path. Pair files by the complete
`(breakpoint, element, state)` triple. Capture is a predecessor task; comparison
must not recapture or select additional targets.

If either image is missing or unreadable, correct the access problem or block this
task. A missing comparison cannot pass.

## Measurement

Compare the declared files with:

```bash
npx storybook-addon-designbook compare-images --reference <ref.png> --actual <story.png> --diff <declared-diff.png>
```

Use `diff_percent`, `diff_path` and `severity` from the CLI output. It does not emit
`passed`; derive that field as `diff_percent <= screenshot.threshold`. Emit every
observed deviation as an actionable issue and one comparison artifact for each
declared screenshot. Write diff/report files only to declared output paths.

## Structural Dimension Drift

Before interpreting pixel diff quality, compare the reference screenshot dimensions with the Storybook screenshot dimensions for the same breakpoint and element.

When width or height differs enough to indicate missing or extra structure, emit an issue that names the dimension drift and treat it as a structural mismatch. Continue writing the normal diff artifact when possible, but do not let screenshot resizing hide missing landmark sections.

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

## Output Discipline

- Compare results must be based on an actual screenshot comparison, not only a
  prose judgment.
- Each compare task must emit one compare artifact entry alongside its issues.
- Missing compare artifacts reduce confidence and must be reflected in the
  emitted artifact and later outtake scoring.
