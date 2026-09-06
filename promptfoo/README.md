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

# All cases
node promptfoo/scripts/generate-configs.mjs
npx promptfoo eval -c promptfoo/promptfooconfig.yaml

# View results
npx promptfoo view
```

## debo-test

`/debo-test run <suite> <case>` and `/debo-test research <suite> <case>` use
Promptfoo exclusively. The shared skill procedure owns the required follow-up
verification, log/artifact audit and research acceptance gates:
[run procedure](../.agents/skills/designbook-test/skills/run/resources/run.md).
The read-only `is-clear` audit does not execute a workflow.

```bash
./promptfoo/scripts/run-single.sh design-shell --suite drupal-web \
  --workspace promptfoo/workspaces/shell-a --output promptfoo/reports/shell-a/main.json
# After preparing a verification prompt for the actual output (no fixture reset):
./promptfoo/scripts/run-single.sh design-shell --suite drupal-web --phase verify \
  --workspace promptfoo/workspaces/shell-a --prompt-file verify-prompt.txt \
  --output promptfoo/reports/shell-a/verify.json
```

Each invocation writes its generated config and evidence alongside its report.
Default reports use unique run directories; an existing explicit `--output` path
is rejected so earlier results remain intact.
`--config-only` validates/generates configuration without starting Codex or rebuilding
a workspace. Main phases rebuild fixtures; verify phases require the existing
workspace and a prompt file. CLI JSONL/stderr and available dbo.log files are kept
for auditing; usage is reported per phase. An individual main-phase report is not
the full debo-test quality verdict. All rendered design tests need design-verify.

## Results across runs

Promptfoo keeps evaluation history in `~/.promptfoo/promptfoo.db` (or
`PROMPTFOO_CONFIG_DIR`). Use `pnpm exec promptfoo view` to inspect saved evaluations.
The JSON reports and raw evidence under `promptfoo/reports/` are local and ignored
by Git. Research also keeps its per-experiment history in `research-runs/`.
Promptfoo's `afterAll` hook appends one row per evaluated result to
[`results.csv`](results.csv), which is versioned in Git. It includes evaluation ID,
suite/case/phase, source commit and dirty flag, model, assertion outcome, tokens,
wall time and the report path. Main/verify rows remain separate; a main phase pass
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
