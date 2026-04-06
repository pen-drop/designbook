# Test Suite

Workflow evaluation using [promptfoo](https://promptfoo.dev) and manual testing via `/debo-test`.

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
├── providers/claude-cli.mjs        # Claude CLI provider
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
prompt: |                    # used by both manual and automated testing
  Run /debo design-screen...
assert:                      # promptfoo assertions (ignored in manual mode)
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

## Manual Testing

```bash
# Via script — sets up workspace, prints prompt
./scripts/setup-test.sh drupal-petshop design-screen

# Via skill — sets up workspace, runs prompt, offers snapshot
/debo-test drupal-petshop design-screen
```

## Creating Fixtures

After a successful workflow run, `/debo-test` offers to snapshot the diff as a new fixture layer. Or manually:

```bash
cd workspaces/drupal-petshop-design-screen
git diff --name-only        # see what changed
# copy changed files to fixtures/drupal-petshop/<fixture-name>/
```
