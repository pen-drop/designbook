# Research through Promptfoo

Use when improving a Designbook skill against a fixture case. Promptfoo is the
only workflow runner. Reuse the [run procedure](../../../skills/run/resources/run.md)
for every train/validation case. The Promptfoo pipeline automatically follows
design-shell, design-entity and design-screen with a separate design-verify evaluation. Apply the artifact,
definition and log gates to both phases. Research never runs domain
intake or task execution on its own thread or through a separate driver agent.

## Inputs

Parse `research <suite> <case> [--workspace <path>] [options]`:

| Option | Default |
|---|---|
| `--val-cases <x,y,...>` | empty; report train-only evidence when absent |
| `--iterations N` | 25 |
| `--plateau N` | 5 consecutive rejected candidates |
| `--metric <jsonata>` | case `metric`, otherwise `tokens.total` |
| `--direction min|max` | case `direction`, otherwise `min` |
| `--target N` | optional, no target stop when absent |
| `--scope <glob,...>` | relevant instruction files; exclude runner, scorer, assertions and thresholds |
| `--baseline-only` | false |

Resolve metric/direction once for all cases against the run's `summary.json`.
For token optimization, use `tokens.total`, reporting cached, uncached, output,
reasoning and runtime alongside it. A single improvement metric is subordinate
to the quality gates; lower token usage cannot compensate for a failed check.

## 1. Prepare

1. Read the train case and validate all case names. The train case must not occur
   in the held-out set. Keep held-out inputs/results out of the optimizer context.
2. Freeze model (`gpt-5.6-luna` by default), reasoning settings, one-hour CLI
   timeout, case inputs, reference, thresholds and comparison scope. Promptfoo's
   result cache stays disabled. Provider prompt caching remains measured normally.
3. Create `research-runs/<run-id>/config.json`, `scope.txt` and `score-history.tsv`.
   Record source commit/diff, cases, metric, direction, settings and run budget.
   Promptfoo appends case/phase measurements to the shared, versioned
   `promptfoo/results.csv`. Keep that file outside the optimizer's editable scope;
   retain all rows and commit the history with the resulting instruction changes.
4. Allocate a unique workspace and report directory per concurrent case. Before
   each case the Promptfoo main phase rebuilds its workspace. Verification phases
   preserve that case's main artifacts. For live Drupal sync cases the provider
   provisions/imports the DB baseline before execution; provisioning failure
   makes that case unevaluable. Score the resulting live DB without resetting it.
5. Keep source changes isolated from unrelated work. Preserve a copy of each
   editable file before applying a candidate; restore only the candidate's changes.

## 2. Baseline

Run train and held-out cases using the shared run procedure. Store each under
`iterations/000-baseline/cases/<case>/` with main/verify Promptfoo reports, raw
logs, workflow definitions, artifact evidence, log validation, friction and summary.

Apply the [audit criteria](../../../resources/audit-criteria.md) to the loaded
instruction files and save `audit.md` beside each case summary. Correlate findings
with the saved JSONL/CLI evidence; give the optimizer only the train audit.

A baseline with failed gates is a diagnostic baseline. First improve correctness;
start token comparisons only once all baseline gates pass. Do not declare a token
saving from skipping failed work or from missing measurements. `--baseline-only`
stops after reporting the measured gates and metrics, including failures.

## 3. Propose one change

Provide an optimizer subagent only the train case's `summary.json`,
`log-validation.json`, `friction.json`, concise audit, score history and allowed
scope. Give raw logs by path for targeted inspection; do not paste full workflows
or transcripts into its context. Its bounded assignment:

> Propose one small change in one allowed instruction file. State the hypothesis,
> the observed friction it addresses, and return a diff without applying it.
> Prefer changes that generalize beyond the train case. Preserve required work,
> checks, output contracts and comparison thresholds. Keep `_debo extract` and
> `_debo capture screenshot` as the extract/capture commands; do not add
> playwright-cli or addon-source workarounds.

This subagent proposes skill edits; it does not execute test cases. Run every
candidate evaluation through Promptfoo. Record optimizer usage separately from
case usage when available; missing optimizer measurement remains unknown.

## 4. Evaluate and decide

1. Validate the proposed diff and scope, save it as `proposed.patch`, then apply it.
2. Re-run train from fresh fixtures through Promptfoo, then design-verify and the
   shared evidence audit. Keep logs from failed attempts as well as successful ones.
3. Reject a candidate with failed assertions, artifacts, definition integrity,
   log validation or visual checks. If repairing a failing baseline, record it
   as a correctness improvement only; it is not a token win yet.
4. If train passes and the chosen metric improves, evaluate every held-out case
   with the same gates/settings. One failed case fails the whole candidate.
5. Confirm prospective token wins with at least three fresh runs per case for
   baseline and candidate. Compare median metrics to reduce run-to-run noise.
   Record all attempts and failures; never select only the cheapest success.
6. Keep only a candidate whose required gates pass without visual regression and
   whose held-out median metric improves (train median when no held-out set).
   Otherwise restore only the candidate changes. A missing log/usage/definition
   snapshot is unevaluable and cannot authorize keeping a change.
7. Append hypothesis, gates, train/val metrics, phase/total tokens, runtime and
   keep/discard/unevaluable decision to history. Preserve original reports; do not
   rewrite failures or suppress open attempts to make assertions pass.

Changing the runner, scorer, fixtures, thresholds or environment is a separate
infrastructure change and requires a new baseline. These files are outside the
skill optimizer's editable scope so it cannot improve scores by weakening tests.

## 5. Stop and report

Stop on the iteration cap, plateau, optional target or user cancellation. Report
best baseline/candidate metrics, quality gates, all kept/rejected hypotheses and
aggregate experiment usage (including verification, repair and failed attempts).
Link the evidence and leave the final workspace available for inspection.

Resume only after matching the recorded source/settings/workspaces to current
state; otherwise establish a new baseline. An unevaluable case remains visible,
with its exact missing evidence or error, rather than receiving a synthetic score.
