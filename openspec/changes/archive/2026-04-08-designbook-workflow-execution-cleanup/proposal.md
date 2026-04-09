## Why

The `--research` pass on `design-screen home` revealed three friction points in `workflow-execution.md` that caused retries and confusion during workflow execution. Removing dead instructions and adding missing documentation reduces agent friction and wasted CLI calls.

## What Changes

- **Remove "Show all DESIGNBOOK_* variables" instruction** from Phase 0 Bootstrap. The agent does not need to display env vars to the user — they are internal context. This eliminates a dead instruction that has no corresponding CLI command (`config show` does not exist).
- **Clarify env var persistence across Bash blocks** in Phase 0 Bootstrap. The `eval "$(npx ... config)"` sets env vars only for the current shell invocation. The `_debo()` helper re-bootstraps on each call, but downstream references to `$DESIGNBOOK_HOME` in other Bash blocks fail silently. Document that all `DESIGNBOOK_*` references must go through `_debo` or re-run the eval.
- **Include `expected_params` in `workflow create` output** — Currently, the agent discovers required params only via trial-and-error against `workflow plan`. The CLI SHALL include a merged `expected_params` map in the `workflow create` JSON response, aggregated from all resolved stages. This lets agents build the correct `--params` JSON without additional CLI calls.

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `workflow-execution`: Remove dead config-display instruction, clarify bootstrap env persistence.
- `workflow-plan-resolution`: `workflow create` SHALL return aggregated `expected_params` from all resolved stages.

## Impact

- **Affected files**: `.agents/skills/designbook/resources/workflow-execution.md` (skill file), `packages/storybook-addon-designbook/` (CLI code for `workflow create`)
- **CLI change**: `workflow create` response gains an `expected_params` field
- **No breaking changes** — existing `workflow create` consumers ignore unknown fields
