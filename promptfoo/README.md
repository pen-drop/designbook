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
`--storybook-port <port>` provisions this workspace's server before measurement.

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

## debo-test

`/debo-test run <suite> <case>` and `/debo-test research <suite> <case>` use
Promptfoo exclusively. The shared skill procedure owns the required follow-up
verification, log/artifact audit and research acceptance gates:
[run procedure](../.agents/skills/designbook-test/skills/run/resources/run.md).
The read-only `is-clear` audit does not execute a workflow.

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
for auditing; usage is reported per phase. Design-shell, design-entity and design-screen always start a separate design-verify evaluation after the main
phase. Fixtures may declare `verify: <case>` to select its criteria; only that
case's prompt is used. Both reports share a run directory and `run_id`. The runner
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
