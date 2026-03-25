# Promptfoo Test Suite

Designbook workflow evaluation using [promptfoo](https://promptfoo.dev).

## Structure

```
promptfoo/
├── configs/                      # All configs live here (source of truth)
│   ├── chain.yaml                # Chain tests (sequential, shared workspace)
│   ├── vision.yaml               # Single-workflow configs
│   ├── sections.yaml
│   ├── design-tokens.yaml
│   ├── css-generate.yaml
│   ├── data-model.yaml
│   ├── data-model-layout-builder.yaml
│   ├── data-model-canvas.yaml
│   ├── shape-section.yaml
│   ├── design-component.yaml
│   ├── sample-data.yaml
│   ├── design-screen.yaml
│   └── design-shell.yaml
├── fixtures/
│   ├── _shared/                  # Shared base (config, node_modules)
│   └── debo-<workflow>/          # Per-workflow fixtures
├── workspaces/                   # Created by scripts from fixtures
├── providers/claude-cli.mjs      # Claude Code CLI provider
└── scripts/
    ├── clean.sh                  # Recreate all workspaces
    ├── setup-workspace.sh        # Setup single workspace
    ├── generate-configs.mjs      # Assemble monolith from configs/ (optional)
    ├── run-single.sh             # Run single test by label
    └── run-chain.sh              # Run chain tests
```

## Run a Single Test

```bash
# List available tests
./promptfoo/scripts/run-single.sh --list

# Run one workflow test
./promptfoo/scripts/run-single.sh data-model-canvas
npx promptfoo view
```

## Run All Tests

```bash
# Assemble monolith config from configs/, then run
node promptfoo/scripts/generate-configs.mjs
npx promptfoo eval -c promptfoo/promptfooconfig.yaml
npx promptfoo view
```

## Run Chained Tests

All workflows run sequentially in a shared workspace — each builds on previous output.

```bash
# Full chain
./promptfoo/scripts/run-chain.sh --clean

# Single workflow
./promptfoo/scripts/run-chain.sh debo-vision

# Workflow + dependencies
./promptfoo/scripts/run-chain.sh debo-css-generate --deps

# Everything up to a workflow
./promptfoo/scripts/run-chain.sh --until debo-data-model
```

### Dependency Graph

```
[01] debo-vision
 ├─ [02] debo-sections
 │   ├─ [06] debo-shape-section
 │   └─ [08] debo-sample-data ← (+ data-model)
 ├─ [03] debo-design-tokens
 │   └─ [04] debo-css-generate
 │       ├─ [07] debo-design-component
 │       ├─ [09] debo-design-screen ← (+ sections, data-model, sample-data, component)
 │       └─ [10] debo-design-shell ← (+ sections)
 └─ [05] debo-data-model
```

## Provider

Claude Sonnet 4.6 for single tests, Claude Opus 4.6 for chain. Timeout 300s, max 50/100 turns.

## Test Product

All tests use **PetMatch** — a fictional pet adoption platform.
