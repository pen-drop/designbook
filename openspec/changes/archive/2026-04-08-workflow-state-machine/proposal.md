## Why

`workflow done` returns a FLAGS JSON blob that the agent must interpret — combining booleans like `storybook_preview`, `merge_available`, and `next_task` to determine where the workflow stands and what to do next. This is intransparent: the agent deduces workflow state from flag combinations instead of being told directly. Adding new lifecycle behavior means adding new flags and teaching every consumer to interpret them.

## What Changes

- **BREAKING**: Rename "stage" → "step" (individual work unit) and introduce "stage" as a grouping concept (execute, test, preview) — aligns with GitLab CI convention
- **BREAKING**: Workflow frontmatter `stages:` changes from a flat list to a grouped structure mapping stages to their steps
- **BREAKING**: `workflow done` returns stage-based responses (`stage`, `next_step`, `waiting_for`) instead of FLAGS JSON
- Replace the `WorkflowEngine` interface (named methods: `setup`, `commit`, `merge`, `cleanup`) with a single `onTransition(from, to)` handler
- Engine can inject required params on transitions — unified blocking mechanism (replaces special-case FLAGS like `merge_available`, `storybook_preview`)
- `WorkflowFile` gains `current_stage` field; tasks gain `stage` assignment
- State machine auto-skips stages with no assigned steps (e.g. `direct` workflows without test/preview)

## Capabilities

### New Capabilities

- `workflow-state-machine`: Stage-based lifecycle — stages declared in workflow frontmatter, state machine derived from declared stages, transitions handled by engine strategy, params as unified blocking mechanism

### Modified Capabilities

- `workflow-execution`: `workflow done` output changes from FLAGS to stage-based response; workflow frontmatter format changes from flat stage list to grouped stages/steps; `WorkflowFile` gains `current_stage` tracking
- `workflow-format`: Frontmatter `stages:` key changes from flat list to grouped structure with steps and optional params
- `designbook-workflow`: Skill execution rules updated for stage-based lifecycle instead of FLAGS interpretation

## Impact

- `packages/storybook-addon-designbook/src/workflow.ts` — `workflowDone` returns stage-based response; state machine logic for phase transitions
- `packages/storybook-addon-designbook/src/workflow-types.ts` — `WorkflowFile` gains `current_stage`; tasks gain `stage` field
- `packages/storybook-addon-designbook/src/engines/types.ts` — `WorkflowEngine` interface replaced with `onTransition(from, to)` handler
- `packages/storybook-addon-designbook/src/engines/git-worktree.ts` — refactor to transition handler
- `packages/storybook-addon-designbook/src/engines/direct.ts` — refactor to transition handler
- `packages/storybook-addon-designbook/src/workflow-resolve.ts` — parse new grouped `stages:` frontmatter format
- `packages/storybook-addon-designbook/src/cli.ts` — update plan command for new stage/step structure
- `.agents/skills/designbook/resources/workflow-execution.md` — replace FLAGS documentation with stage-based response documentation
- All workflow `.md` files — migrate `stages:` frontmatter from flat list to grouped format
