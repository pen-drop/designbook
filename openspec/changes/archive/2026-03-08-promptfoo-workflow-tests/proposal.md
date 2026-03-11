## Why

Designbook has ~15 core debo-workflows that define the product design pipeline (product-vision → sections → tokens → data-model → components → screens). There is no automated way to verify that these workflows produce consistent, correct results across AI model updates. A single promptfoo test exists for `debo-design-screen`, but it only tests planning — not execution. We need fixture-based, deterministic tests for all workflows to catch regressions.

## What Changes

- Create **fixture directories** per workflow containing the prerequisite files each workflow needs (e.g., `debo-product-sections` fixture includes a fixed `vision.md`)
- Create **deterministic, all-in-one prompts** for each workflow that bypass multi-turn conversation by specifying all inputs upfront
- Create **promptfooconfig.yaml** per workflow with `llm-rubric` assertions validating output structure and content
- Add a **clean script** (`promptfoo/scripts/clean.sh`) that wipes the workspace directory before each test run
- Add **workspace isolation** — each test+provider combination gets its own output directory under `promptfoo/workspaces/`, enabling parallel execution
- Test with both `gemini-3-pro` and `claude-opus-4-6` providers

## Capabilities

### New Capabilities
- `promptfoo-workflow-testing`: Fixture-based, deterministic testing infrastructure for all Designbook debo-workflows. Covers workspace isolation, clean command, fixture management, and assertion strategy.

### Modified Capabilities
- `promptfoo-structure`: Extending the existing promptfoo directory layout with fixtures, workspaces, and clean scripts. Adding per-workflow test coverage beyond the existing single `debo-design-screen` test.

## Impact

- `promptfoo/` — New fixtures, workspace infrastructure, and test configs for all workflows
- `promptfoo/scripts/clean.sh` — New clean command
- `promptfoo/fixtures/debo-*/` — Per-workflow fixture directories
- `promptfoo/workflows/debo-*/` — Test configs and deterministic prompts for each workflow
- Depends on `config-resolution-walk-up` change for workspace-local config resolution
