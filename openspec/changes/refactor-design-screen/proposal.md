## Why

The `debo-design-screen` workflow loads ~150KB of skill instructions upfront (Step 3) before any work begins, including a 62KB DaisyUI reference file. This overwhelms the AI model's context window, causing unreliable execution. The workflow also bundles 5 different jobs (planning, shell generation, component creation, view modes, scenes, CSS generation) into a single monolithic flow with an unnecessary plan-and-approve step.

## What Changes

- **BREAKING** Remove the "Read ALL skills upfront" step (Step 3) — replace with just-in-time skill loading per execution step
- **BREAKING** Remove the "Generate Plan + wait for approval" step (Step 4) — execute directly (or `--spec` for dry run)
- Remove shell generation from the workflow — shell becomes a prerequisite (fail-fast if missing)
- Remove `components-entity-sdc` skill reference — replaced by `designbook-scenes` + `designbook-view-modes`
- Remove `designbook-web-reference` skill loading — separate concern, not part of screen design
- Remove inline CSS skill loading — delegate to `//debo-css-generate` workflow
- Remove `daisyui-llms.txt` (62KB) from ever being loaded in this workflow

## Capabilities

### New Capabilities
- `lazy-skill-loading`: Just-in-time skill loading pattern where each execution step loads only the skill it needs, then proceeds. Max ~25KB context at any point instead of ~150KB.

### Modified Capabilities
- `design-shell-workflow`: Shell becomes a hard prerequisite for `debo-design-screen` instead of being generated inline

## Impact

- **Workflow**: `.agent/workflows/debo-design-screen.md` — full rewrite
- **No code changes**: Only workflow instruction files are affected
- **No skill changes**: Skills remain unchanged, only the loading pattern changes
- **Context reduction**: ~150KB → ~25KB max at any execution step
