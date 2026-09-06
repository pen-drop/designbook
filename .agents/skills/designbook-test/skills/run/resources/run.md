# Run a case through Promptfoo

Promptfoo is the only workflow execution runner for `debo-test`. The calling
agent prepares inputs and inspects evidence; it does not execute intake or tasks
inline and does not dispatch a separate case-driver subagent. Codex CLI inside
Promptfoo loads the domain skill and its saved-workflow executor.

## Inputs

Parse `run <suite> [<case>] [--workspace <path>] [--validate <workflow>]`.
Resolve paths from the ticket's repository/worktree root. The default workspace
is `promptfoo/workspaces/<suite>-<case>`. Each concurrent run needs a distinct
workspace and report directory. Use `promptfoo/reports/<run-id>/` for evidence.

Without a case, list cases with:

```bash
./promptfoo/scripts/run-single.sh --list --suite "$SUITE"
```

Read the selected `fixtures/<suite>/cases/<case>.yaml`. A named case is already
authorized. Missing reference, scene, breakpoint or threshold inputs must be
resolved before a design test starts; research treats missing inputs as a fixture
failure. Keep quality thresholds fixed across baseline and candidates.

## 1. Execute the main case

```bash
./promptfoo/scripts/run-single.sh "$CASE" --suite "$SUITE" \
  --workspace "$WORKSPACE" --output "$RUN_DIR/main.json"
```

The provider rebuilds the workspace with `setup-workspace.sh`, layers fixtures
with `setup-test.sh`, then invokes Codex CLI using the configured model and
one-hour timeout. For `sync-*` cases it provisions Drupal and imports the committed
DB baseline through `start-drupal-workspace.sh` before Codex starts. Case
assertions run in Promptfoo. Its `afterAll` hook appends each result to the
versioned `promptfoo/results.csv` across runs, including failures and phase,
commit, model, token and timing fields. Commit this CSV with the tested changes;
raw evidence stays outside Git. The generated config and
Codex JSONL, stderr, prompt, usage and available `dbo.log` copies are saved beside
the report. CLI commands run from the workspace root containing
`designbook.config.yml`; the theme directory is its own git repository.

The driver loads the case's domain skill, prepares a complete definition and
executes the saved path. The prompt requires a `definition-before.yml` copy of the saved `definition`
object in the same directory as each created `tasks.yml`, before execution. Inspect those copies after execution; absence or mutation
fails the integrity check. Record every attempted path, including failed retries.

## 2. Verify the resulting design

**Every design-shell run must execute design-verify after the main run.** Apply
this same visual gate to cases producing rendered designs. Nonvisual cases such
as vision/data-model use their artifact checks; record visual verification as
not applicable with the reason. A missing design reference is a failure for a
rendered-design test, not permission to skip verification.

Prepare `$RUN_DIR/verify-prompt.txt` using the main run's actual scene/story,
original reference, regions, breakpoints and fixed thresholds. Instruct the
`design-verify` intake to verify that output and execute its separate saved
workflow. A suite's verification case can supply comparison criteria, but use
its prompt only: do not layer its fixtures over the output being tested.

```bash
./promptfoo/scripts/run-single.sh "$CASE" --suite "$SUITE" \
  --phase verify --workspace "$WORKSPACE" \
  --prompt-file "$RUN_DIR/verify-prompt.txt" \
  --output "$RUN_DIR/verify.json"
```

This phase preserves the main workspace and runs a new Codex session through
Promptfoo. Keep a snapshot/hash inventory of the main artifacts before the
check. If verification triggers repair, record that separate path and its costs;
its repaired output does not turn the initial design into a passing candidate.
Any accepted repaired design needs a fresh design-verify run against it.

`--validate <workflow>` requests an additional check using the same phase and
its own prompt/report. It cannot replace mandatory design-verify. A main case
which already performs design-verify needs no duplicate check only when saved
paths, logs and artifact hashes prove it checked the final artifacts.

Run verification even after failed main assertions if a renderable result
exists. Otherwise record verification as blocked; the overall run fails.

## 3. Audit evidence and determine outcome

For main, verification and each repair attempt:

1. Read the Promptfoo result, saved workflow and `workflow summary <path>` from
   the workspace root. Completed tasks alone do not prove a visual pass.
2. Inspect the actual produced artifacts and verify the before/after definitions.
3. Audit Codex JSONL and CLI logs for failed commands, schema/validation errors,
   retries, skipped steps, unexplained termination and missing required inputs.
   Use the actual tool-call/result evidence, not the final agent message. Missing
   or incomplete execution evidence makes the run unevaluable. A missing separate
   dbo.log is acceptable only when JSONL contains the relevant CLI calls/results.
4. Verify that design-verify covered every requested region and breakpoint,
   used the intended reference/thresholds, and produced real capture/comparison
   artifacts. Check measured pass/fail results and unresolved issues. Missing
   comparison output fails even when the workflow status is completed.
5. Write `log-validation.json` with `passed`, `findings` (phase, evidence path,
   event/line, issue, resolved) and `friction.json` (locus, issue, guessed). Retain
   recovered errors as findings and include their usage; unresolved errors fail.
6. Write `summary.json`: `passed`, `gates` (assertions, artifacts, definitions,
   logs, visual), workflow/report paths, per-phase `usage` and `durationMs`, plus
   aggregate `tokens` (input, cached, uncached, output, reasoning, total).
   `uncached = input - cached`; `total = input + output`. Cached and reasoning
   are subsets, not extra additions. Missing usage is unknown, never zero.
   Preserve CLI summary fields needed by the case metric. For `expected_config`
   cases, also record `validate_pass_rate` from saved config-file result validity,
   `cim_ok` from the import result and `existence_rate` from live
   `ddev drush config:get <name> --format=json` checks in this workspace. Save
   each command/result as evidence; an unavailable backend is unevaluable.

Success requires all applicable gates. Preserve exact workflow IDs and every
open attempt; never hide a pending workflow through name normalization. A failed
main assertion remains a failure in its original report after any subsequent
check. Only a new run can establish a new baseline.

## 4. Report

Show the overall outcome, failed gates, main and verification reports, artifact
paths, Storybook URL and per-phase/total token usage. Keep logs and screenshots
in the run/workspace directories. Leave services available for inspection.

A fixture snapshot is a separate user-requested action after reviewing the
result. Copy only the inspected artifact diff, preserving theme-relative paths.
