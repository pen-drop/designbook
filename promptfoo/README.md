# Promptfoo Test Suite

Designbook workflow evaluation using [promptfoo](https://promptfoo.dev).

## Structure

```
fixtures/                         # Fixtures live at repo root
├── drupal-petshop/               # Test suite
│   ├── designbook.config.yml     # Base config
│   ├── config-overrides/         # Alternative configs (canvas, layout-builder)
│   ├── vision/                   # Fixture layers (delta-only)
│   ├── tokens/
│   ├── data-model/
│   └── cases/                    # Case files (fixtures + prompt + assertions)
│       ├── vision.yaml
│       ├── design-screen.yaml
│       └── ...
└── drupal-stitch/

promptfoo/
├── configs/                      # Promptfoo configs (reference case files)
│   ├── base.yaml                 # Provider settings
│   ├── chain.yaml                # Chain tests (sequential, shared workspace)
│   └── <case>.yaml               # One per case
├── providers/claude-cli.mjs      # Claude CLI provider (auto workspace setup)
└── scripts/
    ├── clean.sh                  # Recreate all workspaces from fixtures
    ├── generate-configs.mjs      # Generate monolith config from case files
    ├── run-single.sh             # Run single test by case name
    ├── run-chain.sh              # Run chain tests
    ├── show-report.mjs           # Pretty-print test report
    └── test-assertions.mjs       # Smoke-test assertions offline
```

## Run a Single Test

```bash
./promptfoo/scripts/run-single.sh --list
./promptfoo/scripts/run-single.sh data-model-canvas
npx promptfoo view
```

## Run All Tests

```bash
node promptfoo/scripts/generate-configs.mjs
npx promptfoo eval -c promptfoo/promptfooconfig.yaml
npx promptfoo view
```

## Run Chained Tests

All workflows run sequentially in a shared workspace.

```bash
./promptfoo/scripts/run-chain.sh --clean
./promptfoo/scripts/run-chain.sh debo-vision
./promptfoo/scripts/run-chain.sh debo-css-generate --deps
./promptfoo/scripts/run-chain.sh --until debo-data-model
```

## Manual Testing

Same fixtures and prompts, interactive mode:

```bash
# Via script
./scripts/setup-test.sh drupal-petshop design-screen

# Via skill (in Claude)
/debo-test drupal-petshop design-screen
```

## Case File Format

Each case is a YAML file in `fixtures/<suite>/cases/`:

```yaml
config: canvas.yml           # optional config override
fixtures:                    # fixture layers to load
  - vision
  - tokens
  - data-model
prompt: |                    # shared between manual + automated
  Run /debo design-screen...
assert:                      # promptfoo assertions
  - type: javascript
    value: output.newFiles.some(f => f.endsWith('.scenes.yml'))
```

## Provider

The `claude-cli.mjs` provider auto-sets up workspaces when `suite` + `case` vars are present.
Reads prompts from case files. Default: Claude Sonnet 4.6, timeout 800s, max 200 turns.
