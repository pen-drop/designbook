# Verify a test run

Use for standalone verification; the normal design runner already executes
this phase automatically. Inputs are the original suite/case, existing workspace and run directory containing
`main.json`. Run from the ticket's repository/worktree root. This sub-skill owns the
follow-up verification; all domain execution uses Promptfoo with Codex CLI.

## 1. Resolve the actual comparison

Read `main.json`, its saved workflow paths and the actual artifacts. Identify the
produced story/scene, original reference, all requested regions, breakpoints,
selectors and fixed thresholds. A suite's `design-verify-*` case may supply
comparison criteria; use its prompt only. Keep the main artifacts and fixtures.

If no renderable result exists, save `verification.json` with a blocked verdict
and missing artifacts; the overall test fails. If required comparison inputs are
missing, record them as a fixture failure. For research, never relax comparison
scope or thresholds to obtain a passing score.

Save the main artifact hash inventory as `before-verify.json`, then write
`verify-prompt.txt` in the run directory. Instruct the `design-verify` intake to
check the actual output, execute its separate saved workflow, and return the full
score-report and capture/comparison paths. Record repair as a separate attempt;
its artifacts and usage cannot replace the initial measurement.

## 2. Execute design-verify

```bash
./promptfoo/scripts/run-single.sh "$CASE" --suite "$SUITE" \
  --phase verify --workspace "$WORKSPACE" \
  --prompt-file "$RUN_DIR/verify-prompt.txt" \
  --output "$RUN_DIR/verify.json"
```

This starts a new Codex session in the existing workspace. It does not rebuild or
layer fixtures. Promptfoo appends a separate CSV row with the same `run_id`,
`phase=verify` and `workflow_id=design-verify`. The token columns measure this Codex
session; `verify_score` comes from validated score-report results in this saved
workflow. It is the severity sum: lower is better, zero means no scored issues.
`verify_checks_passed` and `verify_checks_total` record comparison coverage.
Missing or invalid measurements stay blank, never synthetic zero.

## 3. Audit and return

Inspect the saved definition snapshot, Codex/CLI logs, validated score-report and
real capture/comparison artifacts. Match all requested regions and breakpoints,
reference paths and thresholds. Confirm the checked artifact hashes still match
the main output. A completed workflow or a CSV score alone is insufficient.
Confirm screenshots show the requested design regions from this workspace's
Storybook, with no server error page or missing selector substituted for a region.
Missing comparisons, unresolved errors or changed main artifacts fail this check.

Save `verification.json` with `passed`, findings and evidence paths, workflow ID,
measured score/check counts, the Promptfoo report and Codex usage. Return those
values to the caller, which performs the shared run audit and aggregates main plus
verification tokens in `summary.json`. Keep recovered errors and their costs.
A repaired design needs a fresh verification in its own run directory.

The normal Promptfoo pipeline attempts verification even after failed main
assertions. Additional checks requested through `--validate` cannot replace it.
