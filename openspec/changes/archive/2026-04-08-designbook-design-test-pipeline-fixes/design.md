## Context

The design-shell workflow's test pipeline was audited via `--research` after a full run. Three structural gaps prevent the visual comparison pipeline from functioning as intended:

1. **Reference data flow broken**: The `resolve-design-reference.md` partial resolves references during intake but the reference array never reaches the create-scene task. Scenes are always written without references.
2. **Inspect step missing from workflows**: The `browser-inspect` spec defines an `inspect` step with `inspect-storybook` and `inspect-stitch` tasks, but no workflow definition includes `inspect` in its stages.
3. **Stale devtools-context rule**: `devtools-context.md` references deprecated Chrome DevTools MCP tools. The `inspect-storybook.md` task (playwright-cli) replaces this functionality entirely.

## Goals / Non-Goals

**Goals:**
- Reference arrays flow from intake through workflow params to create-scene tasks and are written into `*.scenes.yml`
- The `inspect` step is present in all design workflow test stages
- `devtools-context.md` is removed; no stale MCP references remain

**Non-Goals:**
- Changing the CLI's param passing mechanism (it already supports arbitrary params)
- Changing the scene validator (it already accepts `reference:` arrays)
- Adding new test infrastructure — only wiring existing pieces together

## Decisions

### Decision 1: Reference flows as a workflow param, not a reads: dependency

The intake partial already resolves references and builds a structured array. The cleanest path is to include this array in the intake's output params (passed via `workflow done --task intake --params`). The create-scene task then receives it as `{{ reference }}` and writes it into the scene YAML.

**Alternative considered**: Having create-scene read `guidelines.yml` and resolve references itself. Rejected because this duplicates intake logic and breaks the single-responsibility model (intake gathers input, create-scene produces output).

### Decision 2: Insert inspect between screenshot and resolve-reference

The current test stage order is: `storybook-preview, screenshot, resolve-reference, visual-compare, polish`. The `inspect` step fits between `screenshot` and `resolve-reference` because:
- It needs Storybook running (ensured by storybook-preview)
- It needs the story already rendered (ensured by screenshot)
- Its output is consumed by `visual-compare` (must run before it)

New order: `storybook-preview, screenshot, inspect, resolve-reference, visual-compare, polish`.

### Decision 3: Delete devtools-context.md entirely

The rule's functionality (computed style extraction, DOM snapshot, console errors) is fully covered by `inspect-storybook.md` and `inspect-stitch.md`. No migration needed — the MCP tools it references (`mcp__devtools__*`) were never available in the current architecture.

## Risks / Trade-offs

- **[Risk]** Adding `inspect` step increases pipeline duration for every design workflow → Mitigation: inspect tasks have `when: steps: [inspect]` conditions; if no matching tasks exist, the step is a no-op.
- **[Risk]** Existing workflows in archive have the old step order → No risk: archived workflows are read-only records, not re-executed.
