## Context

The designbook workflow engine uses a stage-based model: each workflow has stages with steps, an intake that gathers params, and the CLI expands iterables into tasks. Workflows can chain via `before:` hooks (prerequisite workflows) and `after:` hooks (suggested follow-ups).

Currently there is no concept of a "parent workflow" that orchestrates multiple sub-workflows with pre-filled parameters. The `--parent` flag exists for workflow nesting but is used for tracking context, not for passing data between workflows.

Each workflow's intake asks the user questions. Extension rules (e.g., `stitch-tokens`) can propose defaults during intake, but the user still goes through each workflow separately.

## Goals / Non-Goals

**Goals:**
- Single entry point: user provides a design reference URL → gets a full design system
- Each sub-workflow runs with its own lifecycle (own tasks.yml, own tracking)
- Sub-workflow intakes receive pre-filled params from the import intake
- Reference-agnostic: the import workflow doesn't know about Stitch/Figma/web — extension rules provide the data

**Non-Goals:**
- Auto-mode that bypasses sub-workflow intakes entirely (each sub-workflow still runs with user confirmation)
- Changes to existing workflow definitions or intake tasks
- New extension rules (existing Stitch rules already provide what's needed)

## Decisions

### D1: Import workflow as a standard workflow with sub-workflow tasks

The import workflow is a regular workflow file at `designbook/import/workflows/import.md`. Its intake resolves the design reference and generates a task list. Each task in the execute stage is a sub-workflow call.

```yaml
title: Import Design System
description: Import a full design system from a design reference
stages:
  intake:
    steps: [intake]
  execute:
    each: workflow
    steps: [run-workflow]
engine: direct
```

The intake produces a `workflow` iterable — each entry is a sub-workflow with its pre-filled params:

```json
{
  "workflow": [
    { "workflow": "vision", "params": { "product_name": "My Product", "description": "..." } },
    { "workflow": "design-guidelines", "params": { "design_reference": { "type": "stitch", "url": "..." } } },
    { "workflow": "tokens", "params": {} },
    { "workflow": "css-generate", "params": {} },
    { "workflow": "design-shell", "params": { "reference": "..." } },
    { "workflow": "design-screen", "params": { "section": "homepage", "reference": "..." } },
    { "workflow": "design-screen", "params": { "section": "docs", "reference": "..." } }
  ]
}
```

**Why this approach?** It uses the existing `each:` expansion mechanism. Each sub-workflow task gets its own tracking via `--parent`. The execute stage iterates over the workflow list, running each one in sequence.

### D2: The `run-workflow` task instructs the agent to start a sub-workflow

The `run-workflow` task file is a new task type that tells the agent: "Start the referenced workflow with these pre-filled params as defaults." It doesn't invoke the workflow programmatically — it instructs the agent to follow the normal workflow execution flow (Phase 0 → Phase 1 → Phase 2) but with the params pre-loaded as context.

This means:
- The sub-workflow creates its own `workflow create` → `tasks.yml`
- The sub-workflow intake runs, but the agent uses the pre-filled params as defaults
- The user confirms or modifies the defaults
- The sub-workflow executes normally
- When done, control returns to the import workflow's next task

**Why agent-level orchestration?** The workflow engine is stateless — it doesn't have a concept of "run another workflow." The agent (Claude) already knows how to execute workflows. The task simply says "execute this workflow with these defaults" and the agent follows the standard execution rules.

### D3: Intake resolves reference via existing extension rules

The intake task resolves the design reference by:
1. Reading `guidelines.yml` for an existing `design_reference`, OR asking the user for a URL
2. The extension rules (`stitch-reference`, `stitch-tokens`, `devtools-context`) activate based on the `extensions:` config
3. For Stitch: calls `list_screens` to get available screens, user selects which ones
4. Builds the sub-workflow list with pre-filled params derived from the reference data

The intake task itself is reference-agnostic — it uses the `resolve-design-reference` partial (already exists) and then maps the resolved data to sub-workflow params.

### D4: Sub-workflow order is fixed

The import workflow always runs sub-workflows in this order:
1. `vision` — product name and description (derived from reference project name)
2. `design-guidelines` — sets up the design reference URL
3. `tokens` — imports colors/typography (Stitch extension auto-proposes)
4. `css-generate` — generates CSS from tokens (no user input)
5. `design-shell` — builds the application shell (reference = selected screen)
6. `design-screen` × N — one per selected screen (reference = that screen)

This matches the dependency order: tokens before CSS, CSS before shell, shell before screens.

## Risks / Trade-offs

- **[Risk] Sub-workflow fails mid-import** → Each sub-workflow has its own lifecycle. The import workflow tracks which tasks are done. Resuming re-enters at the failed sub-workflow.
- **[Risk] Extension rules not loaded** → If `extensions: [stitch]` is not in config, the intake falls back to manual input. The import workflow still works, just without auto-fill.
- **[Trade-off] Agent-level vs programmatic orchestration** → Agent-level is simpler (no engine changes) but relies on the agent correctly executing sub-workflows. This is acceptable because the agent already does this for `before:` hooks.
