# Promptfoo Test Suite

Designbook workflow evaluation using [promptfoo](https://promptfoo.dev).

## Structure

```
promptfoo/
├── promptfooconfig.yaml        # All workflow tests (single file)
├── fixtures/
│   ├── _shared/                # Shared PetMatch content
│   └── debo-<workflow>/        # Per-workflow fixture subset
├── workspaces/                 # Test output (gitignored)
├── reports/                    # Eval results
├── scripts/
│   ├── clean.sh                # Remove + recreate workspaces from fixtures
│   └── setup-workspace.sh      # Setup single workspace
└── README.md
```

## Quick Start

```bash
# Clean workspaces and seed from fixtures
./promptfoo/scripts/clean.sh

# Run all workflow tests
npx promptfoo eval -c promptfoo/promptfooconfig.yaml

# Run single workflow
npx promptfoo eval -c promptfoo/promptfooconfig.yaml \
  --filter-pattern "debo-vision"

# View results
npx promptfoo view
```

## Test Product

All tests use **PetMatch** — a fictional pet adoption platform. Fixtures in `fixtures/_shared/` contain the complete PetMatch dataset.

## Provider

Tests run against **Claude Opus 4.6** via Claude Code provider.

- Timeout: 300s per test
- Max concurrency: 1 (sequential)

## Assertions

All assertions use `llm-rubric`. Each rubric verifies conversation output:
1. The agent confirms file creation
2. Key content elements are mentioned
3. No errors or failures are reported

## Config

Fixtures use `tailwind` CSS framework with `sdc` components and `drupal` backend.
