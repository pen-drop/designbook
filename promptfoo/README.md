# Promptfoo Test Suite

Designbook workflow evaluation using [promptfoo](https://promptfoo.dev).

## Structure

```
promptfoo/
├── promptfooconfig.yaml        # All workflow + addon tests (single file)
├── fixtures/
│   ├── _shared/                # Shared PetMatch content
│   └── debo-<workflow>/        # Per-workflow fixture subset
├── workspaces/                 # Test output (gitignored)
├── reports/                    # Eval results
├── scripts/
│   └── clean.sh                # Remove workspaces
└── README.md
```

## Quick Start

```bash
# Run all workflow tests
npx promptfoo eval -c promptfoo/promptfooconfig.yaml

# Run single workflow
npx promptfoo eval -c promptfoo/promptfooconfig.yaml \
  --filter-pattern "product-vision"

# Clean workspaces before re-run
./promptfoo/scripts/clean.sh

# View results
npx promptfoo view
```

## Test Product

All tests use **PetMatch** — a fictional pet adoption platform. Fixtures in `fixtures/_shared/` contain the complete PetMatch dataset.

## Provider

Tests run against **Gemini 3.1 Pro** (Google Antigravity) only.

- Timeout: 300s per test
- Max concurrency: 1

## `--spec` Mode

All workflow prompts use `--spec` mode. When `--spec` is passed, workflows output a structured YAML plan instead of creating files. This enables testing without side effects.

## Assertions

All assertions use `llm-rubric` — no custom scripts. Each rubric verifies conversation output:
1. The agent confirms file creation
2. Key content elements are mentioned
3. No errors or failures are reported

## Multi-Integration Support

Currently tests run against the **Drupal** integration (`test-integration-drupal`). When a React integration is added, parameterize via `vars`:

```yaml
tests:
  - vars:
      integration: react
      storybook_port: 6010
```

