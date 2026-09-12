# Test Suite

Workflow evaluation using [promptfoo](https://promptfoo.dev) as the only workflow runner for `/debo-test run` and `/debo-test research`.

## Structure

```
fixtures/                           # Test data (repo root)
├── drupal-petshop/                 # Suite: PetMatch demo project
│   ├── designbook.config.yml       # Base config (backend: drupal)
│   ├── config-overrides/           # Alternative configs
│   │   ├── canvas.yml              #   Canvas extension
│   │   └── layout-builder.yml      #   Layout Builder extension
│   ├── vision/                     # Fixture layers (delta-only)
│   ├── tokens/
│   ├── data-model/
│   ├── design-component/
│   ├── sections/
│   ├── sample-data/
│   └── cases/                      # Test cases
│       ├── vision.yaml
│       ├── design-screen.yaml
│       ├── data-model-canvas.yaml
│       └── ...
└── drupal-stitch/                  # Suite: Stitch import project

scripts/
└── setup-test.sh                   # Shared workspace setup

promptfoo/
├── configs/
│   └── base.yaml                   # Provider settings (model, timeout)
├── providers/codex-cli.mjs        # Codex CLI provider
└── scripts/
    ├── run-single.sh               # Run one case
    ├── generate-configs.mjs        # Generate monolith from case files
    ├── clean.sh                    # Rebuild all workspaces
    ├── show-report.mjs             # Pretty-print report
    └── test-assertions.mjs         # Offline assertion smoke-test
```

## Case File Format

Single source of truth for fixtures, prompts, and assertions:

```yaml
config: canvas.yml           # optional config override
fixtures:                    # fixture layers to load (in order)
  - vision
  - tokens
  - data-model
prompt: |                    # executed through Promptfoo
  Run /debo design-screen...
assert:                      # assertions evaluated by promptfoo
  - type: javascript
    value: output.newFiles.some(f => f.endsWith('.scenes.yml'))
```

## Automated Testing (promptfoo)

```bash
# Single case
./promptfoo/scripts/run-single.sh data-model-canvas
./promptfoo/scripts/run-single.sh --list

# View results
npx promptfoo view
```

Select a CLI with `--provider codex|claude|grok` and optionally `--model <id>`.
Defaults are `gpt-5.6-luna` and `claude-opus-5`; both use the one-hour limit in
`configs/base.yaml`. The automatic verify phase uses the same provider/model.
Storybook is not pre-provisioned: the executing agent starts it via
`storybook start`, which picks a free port and records it for `storybook status`.

Grok uses `grok-4.6` with `streaming-messages-json`. Its adapter checks that
the terminal usage equals the sum of the complete assistant-message counters;
cache reads and writes are added to ordinary input once. Grok subagents are
disabled until their native accounting is verified. Codex reasoning is pinned
to `medium` (overridable through provider `reasoningEffort`), independently of
the invoking user's CLI default.

Failed processes and artifact collection retain valid terminal usage in response
metadata and CSV history. Incomplete or invalid native logs leave usage unknown.
CSV records usage source/scope, measured subagent contribution, reasoning setting
and raw evidence directory. Unknown historical fields remain empty.

Run two independent `run-single.sh` invocations with distinct workspaces and
report directories to compare models. Prepare fresh workspaces sequentially
through the provider's `setupWorkspace` before starting concurrent model calls;
`--prepared-workspace` preserves that preparation. Ordinary single runs rebuild
their workspace.

## Experiments (DESIGNBOOK-62)

Committed manifests and reports live under `docs/experiments/<id>/`. Durable raw
proof (native logs, tool ledgers, judgments, approval provenance) lives under
**gitignored** `promptfoo/evidence/<id>/<run-id>/`. Workspace cleanup must never
delete the evidence store.

```bash
node promptfoo/scripts/experiment-cli.mjs validate docs/experiments/_fixtures/minimal/experiment.yml
node promptfoo/scripts/experiment-cli.mjs report <experiment-id>
node promptfoo/scripts/experiment-cli.mjs judge <evidence-run> \
  --result result.png --reference reference.png \
  --status pass --criteria "layout parity" [--blind]
node --test promptfoo/tests/experiment-*.test.mjs
```

Authoring guide: [`docs/experiments/README.md`](../docs/experiments/README.md).
Skill route: `/debo-test experiment validate|report|judge …`.

Reference approval modes: `interactive` (attended real human), `recorded`,
`simulated`. Only interactive counts as real human reference approval; never
promote simulated/recorded to human optical design judgment.

## debo-test

`/debo-test run <suite> <case>` and `/debo-test research <suite> <case>` use
Promptfoo exclusively. The shared skill procedure owns the required follow-up
verification, log/artifact audit and research acceptance gates:
[run procedure](../.agents/skills/designbook-test/skills/run/resources/run.md).
The read-only `is-clear` audit does not execute a workflow.
`/debo-test experiment` routes to the experiment CLI above.


```bash
./promptfoo/scripts/run-single.sh design-shell --suite drupal-web \
  --workspace promptfoo/workspaces/shell-a --output promptfoo/reports/shell-a/main.json
# The command above automatically runs design-verify and writes verify.json.
# For an explicitly requested standalone recheck:
./promptfoo/scripts/run-single.sh design-shell --suite drupal-web --phase verify \
  --workspace promptfoo/workspaces/shell-a --prompt-file verify-prompt.txt \
  --output promptfoo/reports/shell-a/verify.json
```

Each invocation writes its generated config and evidence alongside its report.
Default reports use unique run directories; an existing explicit `--output` path
is rejected so earlier results remain intact.
`--config-only` validates/generates configuration without starting a model or rebuilding
a workspace. Main phases rebuild fixtures; verify phases require the existing
workspace and a prompt file. CLI JSONL/stderr and available dbo.log files are kept
for auditing; usage is reported per phase. Design-shell, design-entity and design-screen start a separate design-verify evaluation after successful main
execution. Fixtures may declare `verify: <case>` to request the follow-up. Automatic
verification takes its reference binding, stories, exact selectors, views and
states exclusively from the saved main plan; it never copies the standalone
verification case's prompt or imports its fixtures. The saved comparison threshold
is used when present; otherwise `verificationThresholdPercent` in `configs/base.yaml`
applies (3% by default). Both reports share a run directory and `run_id`. The runner
fails if either phase fails, comparisons do not pass, or verification changes
main artifacts. The shared skill still audits the real capture/comparison logs.
Calling `promptfoo eval` directly on an individual generated config runs only
that phase; use `run-single.sh` for the complete pipeline.

## Results across runs

Promptfoo keeps evaluation history in `~/.promptfoo/promptfoo.db` (or
`PROMPTFOO_CONFIG_DIR`). Use `pnpm exec promptfoo view` to inspect saved evaluations.
The JSON reports and raw evidence under `promptfoo/reports/` are local and ignored
by Git. Research also keeps its per-experiment history in `research-runs/`.
Promptfoo's `afterAll` hook appends one row per evaluated result to
[`results.csv`](results.csv), which is versioned in Git. It includes evaluation ID,
suite/case/phase, workflow ID, shared run ID, source commit and dirty flag, model,
assertion outcome, native CLI tokens, wall time and the report path. Verification rows
also record `verify_score` (sum of check severity scores, lower is better),
`verify_checks_passed` and `verify_checks_total` from the selected workflow's
validated score-report. Missing/invalid reports stay blank; a measured zero stays
zero. Additional verification columns contain:

- `verify_checks_failed`, `verify_pass_rate`: failed checks and passed/total ratio.
- `verify_avg_diff_ratio`, `verify_max_diff_ratio`: mean and worst pixel deviation
  across all checks. Ratios use 0–1: `0.03` means 3%. If any check lacks a pixel
  measurement, both aggregates stay blank.
- `verify_issues_critical`, `verify_issues_major`, `verify_issues_minor`: summed
  issue occurrences across checks, including the same defect at multiple breakpoints.
- `verify_initial_score`, `verify_score_delta`: first-shot score and initial minus
  final score. Positive delta means improvement; missing initial evidence stays blank.
- `verify_story_ids`, `verify_reference_urls`, `verify_breakpoints`: JSON arrays
  identifying the measured scope.
- `verify_thresholds_json`: per-story thresholds as ratios; `verify_checks_json`:
  each check's story, region, breakpoint, score, pass/fail, pixel ratio and severities.

These are raw reported measurements. The separate evidence audit determines whether
captures are valid designs; CSV values alone do not establish visual validity.
`cli` identifies the runner. For Claude, input totals include ordinary input,
cache creation and cache reads; `cache_write_input_tokens` is the creation subset,
while `cached_input_tokens` counts reads. Uncached input includes cache writes.
Reasoning is recorded only when the CLI supplies it; missing counts stay blank.
Per-model native Claude usage is also retained in the JSON report.
Token columns on the verify row belong only to that CLI session; embedded
agent estimates in score-report are ignored. Main/verify rows remain separate; a main phase pass
alone does not establish overall design quality. Failed attempts are included and
missing token measurements stay blank. Writes are locked for parallel runs.
`--history <path>` selects another CSV, for example in isolated runner tests.
Commit the CSV alongside instruction changes; raw reports/logs remain ignored.

## Runner regression checks

```bash
node --test promptfoo/tests/runner.test.mjs
```

These checks use a simulated Codex executable, including one real Promptfoo
invocation. They test runner contracts; they do not establish design quality.

## Creating Fixtures

After inspecting a successful run, request a fixture snapshot or copy its artifact diff:

```bash
cd promptfoo/workspaces/drupal-petshop-design-screen/web/themes/custom/test_integration_drupal
git diff --name-only        # see what changed
# copy changed files to fixtures/drupal-petshop/<fixture-name>/
```


### Design pipeline responsibilities

Promptfoo provisions the workspace, selects the planner and executor models,
starts one executor agent for the complete saved workflow, and records native logs, tokens and
results. Installed skills own intake presentation, reference selection/capture,
planning instructions and design verification. The Designbook CLI owns domain
schemas, publication and workflow validation.

The intake handoff carries the assistant presentation verbatim, the saved catalogue
path and the native log path. Promptfoo does not parse selector tables, recognize
column labels, match reference metadata or reject historical capture attempts.
There is currently no independent static check of selector-presentation completeness
in Promptfoo; that requirement remains in the installed intake skill.

Planning must leave the target plan pending and application artifacts untouched.
The executor follows the installed execute-workflow skill, completing all tasks
of one step together before continuing to the next. Unrelated workflow attempts remain in the evidence but are not a
run-wide completion gate. Final case/build checks and validated comparison scores
remain the outcome checks; verification may not change the main artifacts.

Failed intake, planning or execution skips automatic verification with an explicit
reason in `pipeline.json`. No verifier model is launched and no score or token row
is invented. Successful main execution starts a separate design-verify call using
the planner model. The generated configs identify every attempted phase and log.
All actual calls, including failures, remain in the CSV history. This changed test
harness requires a fresh baseline before efficiency comparisons.

### Context logs

Every CLI phase writes `context.jsonl` and `context-summary.json` beside its raw
CLI log, and links the summary from `run.json` as `contextLog`. Request rows use
native per-request input tokens, including cached input, rather than cumulative
phase usage. Summaries report peak/last input tokens, observed context-window
limits and compaction events. These are root-thread observations; subagent
context is not included. Unavailable values are `null`, never estimated from
phase totals. On failed or timed-out runs the log covers only available events.

Codex sessions are persisted and their native session log is copied to
`codex-session.jsonl` so request usage and compaction remain inspectable. Earlier
`--ephemeral` runs cannot be reconstructed from terminal totals. Claude/Grok use
native assistant-message usage, deduplicated by message ID; context limits are
recorded only when the CLI reports them. No missing context limits are inferred.

### Workflow reading views and step batches

Saved workflows carry an explicit `step` ID on every task. The executor reads
`workflow steps <path>` for routing, then
`workflow instructions <path> --step <id> --format md` for the current batch.
This contains all tasks in that step, their shared context once, reachable
schemas and predecessor results. Tasks in a step are independent; dependencies
cross steps. `start`, `done` and `block` accept `--step` and return compact
status, without the full definition. Batch `done` takes a JSON object keyed by
all task IDs and marks them done together only when every result passes.

For human inspection, `workflow read <path> --format md` exports the complete
saved plan. Promptfoo also writes `workflow-<number>.md` beside each phase's
CLI evidence and exposes its path in `output.workflowMarkdown`. The export contains
only the immutable plan, with each shared instruction/context body once and stable
internal links. Runtime state/results remain in JSON inspection and reports.


### Separate planner and executor

Every design intake test uses separately configured planner and executor roles.
Set defaults in `configs/base.yaml` under `modelRoles.planner` and
`modelRoles.executor` (each with `provider` and `model`). The checked-in defaults
are Opus and Luna; any supported provider/model combination is configurable,
including the same model for both roles. Override either role explicitly:

```bash
./promptfoo/scripts/run-single.sh design-shell --suite drupal-web \
  --provider claude --model claude-opus-5 \
  --executor-provider codex --executor-model gpt-5.6-luna \
  --workspace promptfoo/workspaces/shell-split \
  --output promptfoo/reports/shell-split/main.json
```

For example, choose Codex for both roles with
`--provider codex --model gpt-6-astra --executor-provider codex --executor-model gpt-5.6-luna`,
or Claude with `--provider claude --model opus --executor-provider claude --executor-model sonnet`.
Model IDs/aliases are forwarded to the selected native CLI; configuration tests
verify routing, not account availability or model quality.

The pipeline is `intake → plan → execute-workflow → verify`. Intake and planning
use the planner model. Planning writes the complete `tasks.yml`, with every task
assigned to a step. Promptfoo then invokes the configured executor model exactly
once with the saved path and the installed `execute-workflow` skill.

The executor owns the step loop: obtain ready steps from the Designbook CLI,
read instructions for the current step, produce all tasks in that step, submit
them together and continue until complete or blocked. Promptfoo does not read or
embed step work orders, choose ready steps, or launch a model for each component.
The worker startup prompt contains the saved path, not the full plan or extract.

Both model roles remain independently configurable, including choosing the same
model for both. Automatic verification uses the planner model and runs only after
successful execution. `plan.json`, `main.json`, `model-pipeline.json`, native logs
and `pipeline.json` preserve results and failures. Each actual model call has one
CSV row; per-step CLI activity is recorded inside the executor's native log.

The one-hour timeout applies to the entire executor invocation. A model context
may accumulate during execution; a single agent does not imply a fresh context
per step. There is no Promptfoo per-step prompt-size gate because the work orders
are now retrieved by the agent through CLI tool calls.
