# Promptfoo Test Suite

Designbook workflow evaluation using [promptfoo](https://promptfoo.dev).

## Structure

```
promptfoo/
├── workflows/
│   └── promptfooconfig.yaml    # All workflow + addon tests (single file)
├── skills/
│   └── test-chat/              # Skill-level tests
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

## Providers

Each test runs against two providers:
- `gemini-3-pro` (Google Antigravity)
- `claude-opus-4-6` (Claude via Antigravity)

## Assertions

All assertions use `llm-rubric` — no custom scripts. Each workflow test verifies:
1. Expected files were created
2. File structure matches the workflow's SKILL.md contract
3. Content is semantically valid

## Multi-Integration Support

Currently tests run against the **Drupal** integration (`test-integration-drupal`). When a React integration is added:

```yaml
# Parameterize via vars
tests:
  - vars:
      integration: react
      storybook_port: 6010
```
