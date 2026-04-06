## Why

Task IDs are currently generated from `<step>-<param_value>` (e.g. `create-vision-Designbook`). This pattern causes friction because:

1. **Confusion with titles**: The CLI displays human-readable titles (`Create Vision: Designbook`) alongside IDs. Agents confuse the two and use the title as ID, causing `Task not found` errors and retries.
2. **Fragile construction**: Agents must reconstruct IDs from step names and param values — including original casing and spaces. The RESPONSE JSON from `workflow done --task intake` does not include the expanded task IDs.
3. **Multiple files per task**: A task can have multiple output files, so hashing a single filename wouldn't work. The ID must be task-scoped, not file-scoped.

## What Changes

- **Replace `generateTaskId()` with short hash**: Generate a 4-6 character hash from `step + params` (or `step + index`) at task creation time. Short, unique within workflow scope, no ambiguity with titles.
- **Return task IDs in intake response**: The `workflow done --task intake` RESPONSE JSON includes an `expanded_tasks` array with the generated IDs, so agents never construct IDs manually.
- **Update skill documentation**: `workflow-execution.md` Phase 2 documents that task IDs come from CLI responses, not manual construction.

## Capabilities

### New Capabilities
- `workflow done --task intake` RESPONSE includes `expanded_tasks: [{ id, step, stage, params }]`

### Modified Capabilities
- `generateTaskId()` in `workflow-resolve.ts` produces short hashes instead of `<step>-<param_value>`
- `workflow-execution.md` Phase 2 updated to use IDs from CLI response

## Impact

- `packages/storybook-addon-designbook/src/workflow-resolve.ts` — `generateTaskId()` function
- `packages/storybook-addon-designbook/src/cli.ts` — intake done response format, `runPlanLogic()`
- `.agents/skills/designbook/resources/workflow-execution.md` — Phase 2 task ID documentation
- All existing archived workflows keep their old IDs (no migration needed — only active workflows affected)
