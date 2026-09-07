# Run a case through Promptfoo

Promptfoo is the only workflow execution runner for `debo-test`. The calling
agent prepares inputs and inspects evidence; it does not execute intake or tasks
inline and does not dispatch a separate case-driver subagent. The selected CLI inside
Promptfoo loads the domain skill and its saved-workflow executor.

## Inputs

Parse `run <suite> [<case>] [--workspace <path>] [--validate <workflow>]`.
Accept `--provider codex|claude` and `--model <id>` and forward them to the runner.
For requested parallel model comparisons, use two independent Promptfoo runs as in
[the Promptfoo guide](../../../../../../promptfoo/README.md#automated-testing-promptfoo).
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
with `setup-test.sh`, then invokes the selected CLI using the configured model and
one-hour timeout. For `sync-*` cases it provisions Drupal and imports the committed
DB baseline through `start-drupal-workspace.sh` before the model starts. Case
assertions run in Promptfoo. Its `afterAll` hook appends each result to the
versioned `promptfoo/results.csv` across runs, including failures and phase,
commit, model, token and timing fields. Commit this CSV with the tested changes;
raw evidence stays outside Git. The generated config and
CLI JSONL, stderr, prompt, usage and available `dbo.log` copies are saved beside
the report. CLI commands run from the workspace root containing
`designbook.config.yml`; the theme directory is its own git repository.

The driver loads the case's domain skill, prepares a complete definition and
executes the saved path. The prompt requires a `definition-before.yml` copy of the saved `definition`
object in the same directory as each created `tasks.yml`, before execution. Inspect those copies after execution; absence or mutation
fails the integrity check. Record every attempted path, including failed retries.

## 2. Inspect the automatic verification

For design-shell, design-entity and design-screen, the Promptfoo runner executes a second, separate
`design-verify` evaluation after the main evaluation, including after failed main
assertions. Other rendered-design fixtures declare `verify: <case>` to use the
same pipeline. A case with explicit `validate: none` uses its concrete main-run
build/browser acceptance criteria without reference comparison; an explicit `verify`
case still requests that separate phase. Only the verifier case's prompt is reused; its fixtures are never
layered over the main output. Both CSV rows share a `run_id`; the verification row
has `workflow_id=design-verify` and its own CLI tokens and measured score.

Read both `main.json` and `verify.json` plus the generated `pipeline.json`.
The runner returns success only when both evaluations pass. Verification requires
a validated score-report, passing comparison thresholds and unchanged main
artifacts. The evidence audit below remains required. Missing references or
comparison inputs fail a requested verification rather than skipping it.

Use [debo-test verify](../../verify/SKILL.md) only for an explicit standalone check
or a new check after repair. Do not duplicate the automatic verifier. Nonvisual
cases such as vision/data-model mark visual verification not applicable.
`--validate <workflow>` adds another check; it cannot replace the pipeline verifier.
Include every phase in the final audit and token totals before returning.

## 3. Audit evidence and determine outcome

For main, verification and each repair attempt:

1. Read the Promptfoo result, saved workflow and `workflow summary <path>` from
   the workspace root. Completed tasks alone do not prove a visual pass.
2. Inspect the actual produced artifacts and verify the before/after definitions.
3. Audit the selected CLI's JSONL and command logs for failed commands, schema/validation errors,
   retries, skipped steps, unexplained termination and missing required inputs.
   Use the actual tool-call/result evidence, not the final agent message. Missing
   or incomplete execution evidence makes the run unevaluable. A missing separate
   dbo.log is acceptable only when JSONL contains the relevant CLI calls/results.
4. When reference verification applies, verify that design-verify covered every requested region and breakpoint,
   used the intended reference/thresholds, and produced real capture/comparison
   artifacts. Check measured pass/fail results and unresolved issues. Missing
   comparison output fails even when the workflow status is completed.
   Inspect the screenshot content: a server error page, absent target selector or
   capture from another workspace invalidates the measurement even when its pixel
   difference falls below the threshold. Keep the raw CSV score as reported and
   mark the run unevaluable in the audit; exclude it from research comparisons.
5. Write `log-validation.json` with `passed`, `findings` (phase, evidence path,
   event/line, issue, resolved) and `friction.json` (locus, issue, guessed). Retain
   recovered errors as findings and include their usage; unresolved errors fail.
6. Write `summary.json`: `passed`, `gates` (assertions, artifacts, definitions,
   logs, visual), workflow/report paths, `verification` (score, checks passed/total),
   per-phase `usage` and `durationMs`, plus
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

## Case evidence and scoring

When a case declares `evidence`, the Promptfoo driver saves `case-runs.json` in
the workspace root: an ordered manifest of every execution with absolute
`workflow`, `definitionBefore`, `evidence` and `artifactSnapshot` paths. A single
execution uses a one-entry array. The provider reads this manifest and collects
the listed theme-relative files plus changed case artifacts through the shared
[scorer](../../../resources/eval-score.mjs).
`setup-test.sh`'s fixture commit is the baseline. Keep that commit fixed throughout
the case; pass `--baseline <commit>` if the theme HEAD changes. The scorer exposes
parsed `fileContents` and `baselineContents`, SHA-256 `fileHashes` and
`baselineHashes`, and `unchangedFiles`. Missing files never count as preserved.
`evidence.mappings` selects bounded `{file, data, record?}` JSONata evaluations for
semantic assertions. Component inventory contains existing metadata paths only.

Before execution, bind each case observation to a concrete story URL, selector,
viewport and expected value in the saved definition. After the real commands and
browser interactions, save one JSON evidence file per execution:

```json
{
  "build": {
    "command": "pnpm build-storybook",
    "cwd": "/absolute/workspace/web/themes/custom/test_integration_drupal",
    "exitCode": 0,
    "stdout": "<actual captured build output>"
  },
  "checks": [
    {
      "url": "<actual checked story URL>",
      "result": { "ok": true },
      "observations": { "<case observation key>": "<observed value>" }
    }
  ]
}
```

Copy the complete actual `CHECK_RESULT` object into `result`; the abbreviated
example shows only the field assertions consume. Record observations from browser
measurements/interactions at the declared selectors and viewport, with supporting
logs/screenshots beside the evidence. Expected values in a case are acceptance
criteria, never substitutes for observations. A static build and a console check
alone do not establish behavior.

Run from the workspace root, using absolute paths:

```bash
node <repo>/.agents/skills/designbook-test/resources/eval-score.mjs \
  --workflow <saved-tasks.yml> --case <case.yaml> \
  --data-dir <theme>/designbook --theme-dir <theme> \
  --definition-before <definition-before.yml> --evidence <evidence.json> \
  --snapshot <artifact-snapshot.json>
```

The before-file contains only the definition object. Require a positive assertion
count, all assertions passed and no failures. The process exit code alone does not
mean the case passed. Every execution must contain the exact nonempty planned task
set, completed state and valid required results; the scorer exposes this as
`runs[].complete`. The workflow-ID maps remain useful for single-run cases;
`runs[]` is the execution-path identity for repeated cases.

When `repeat: {count: 2, same_prompt: true}` is present, the Promptfoo driver completes the domain intake and saved executor twice
within the same evaluation, with identical domain requests and distinct definition IDs. Save a distinct definition and
execution path for each run. Capture the first run's artifact snapshot and evidence
before starting the second. The first scoring call can fail the not-yet-complete
repeat assertions; it still writes its snapshot. After both runs, write a JSON
`case-runs.json` manifest array with one entry per execution:

```json
[
  {
    "workflow": "<first-tasks.yml>",
    "definitionBefore": "<first-before.yml>",
    "evidence": "<first-evidence.json>",
    "artifactSnapshot": "<first-snapshot.json>"
  },
  {
    "workflow": "<second-tasks.yml>",
    "definitionBefore": "<second-before.yml>",
    "evidence": "<second-evidence.json>",
    "artifactSnapshot": "<second-snapshot.json>"
  }
]
```

Pass `--runs <manifest.json>` on the final scoring call, with `--workflow` and
`--definition-before` selecting the second execution. Collect both workflow summaries.
Each run keeps its own definition comparison, command results, browser observations
and snapshot with distinct IDs and execution paths. Rebuilding or relayering
between these two executions invalidates the repeat case.
