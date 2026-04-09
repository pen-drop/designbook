## Why

The `sections` workflow cannot create more than one section per run. The `execute` stage is missing `each: section`, so `workflow plan` rejects array params and only expands a single task. This was discovered during a `--research` pass — the workaround was manual file creation, bypassing the entire plan/execute cycle.

Additionally, the intake task documents a `--items` format that doesn't exist in the CLI, the `create-section` task template omits YAML quoting (causing parse errors on special characters), and intake tasks remain `pending` after `workflow plan` forcing manual completion.

## What Changes

- Add `each: section` to the `sections` workflow's execute stage so `workflow plan` can expand one task per section
- Update `intake--sections.md` to document the correct `--params` format (named arrays keyed by `each` name)
- Add YAML quoting to `create-section.md` template values that may contain special characters
- Auto-mark intake tasks as `done` after `workflow plan`, or document the required manual step in `workflow-execution.md`

## Capabilities

### New Capabilities

_None — this is a fix to existing functionality._

### Modified Capabilities

- `workflow-plan-resolution`: The sections workflow's execute stage gains `each: section` for proper iterable expansion
- `workflow-execution`: Intake task lifecycle needs clarification — auto-done after plan or documented manual step

## Impact

- `.agents/skills/designbook/sections/workflows/sections.md` — frontmatter change
- `.agents/skills/designbook/sections/tasks/intake--sections.md` — params format documentation
- `.agents/skills/designbook/sections/tasks/create-section.md` — YAML template quoting
- `.agents/skills/designbook/resources/workflow-execution.md` — intake task lifecycle (if manual step chosen)
- Storybook addon CLI (`workflow plan`) — may need fix if intake tasks should auto-complete
