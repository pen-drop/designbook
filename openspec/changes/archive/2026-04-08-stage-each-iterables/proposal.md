## Why

Workflow stages that iterate over items (components, scenes) require the agent to manually build `--items` arrays for every step, including test steps whose items are derivable from the execute stage. This leads to two bugs: (1) test stages are silently skipped because no items are provided, and (2) duplicate tasks are created when multiple task files match a step. The `each` keyword on stages solves both by letting the CLI auto-expand tasks from iterables that the intake provides.

## What Changes

- **BREAKING** Add `each: <iterable>` keyword to workflow stage definitions — the CLI expands all steps in that stage once per item in the named iterable
- Remove `--items` from `workflow plan` — replace with iterable arrays in `--params` (e.g. `params.component`, `params.scene`)
- Make intake an engine-level convention (always runs first, not declared as a stage step)
- CLI auto-expands test-stage tasks from iterables without agent involvement
- Update all design workflow frontmatter files to use new `each` syntax
- Update `workflow-execution.md` execution rules for the new plan flow

## Capabilities

### New Capabilities
- `stage-each-expansion`: CLI auto-expands stage steps into tasks based on `each: <iterable>` declarations, eliminating manual item construction

### Modified Capabilities
- `workflow-execution`: Intake becomes an engine convention (not a stage step), `--items` replaced by iterable params, plan phase simplified
- `workflow-format`: Stage definitions gain `each` keyword, intake removed from steps arrays
- `workflow-plan-resolution`: Plan command reads `each` from stages and expands iterables into tasks automatically

## Impact

- CLI source: `workflow plan` command (cli.ts), `resolveAllStages` (workflow-resolve.ts)
- Workflow frontmatter: all workflows with stages (design-shell, design-screen, design-component, css-generate, data-model, tokens, etc.)
- Skill task files: intake tasks removed from stage steps arrays
- `workflow-execution.md`: execution rules rewritten for new flow
- Agent behavior: no more manual `--items` construction for test stages
