## Why

`workflow-resolve.ts` had two near-identical file-resolution functions (`resolveTaskFile` and `matchRuleFiles`) with duplicated glob + parse + filter loops. The `when`-matching merged everything into one flat context object, losing the semantic distinction between runtime state (current stage, template) and project config (backend, frameworks). Special-case handling for `stages`, `extensions`, and `template` keys added complexity.

## What Changes

- **Unified `resolveFiles()` function** replaces duplicated glob+parse+filter loops in both `resolveTaskFile` and `matchRuleFiles`
- **Two-source `checkWhen(when, context, config)`** replaces single-source `checkWhen(when, mergedContext)` — checks context first, config fallback, with dot-path traversal
- **`lookup(key, context, config)`** provides context-first key resolution with dot-path fallback for nested config structures
- **`buildRuntimeContext(stage?, extra?)`** replaces `buildWhenContext` — only builds stage-specific runtime values, no config spreading
- **`buildEnrichedConfig(config)`** enriches config with DESIGNBOOK_* env vars and normalized extensions array
- **Removed**: `buildWhenContext` (replaced by separated concerns above)
- **`checkWhen` returns `number | false`** instead of `boolean` — specificity count is built into the return value

## Capabilities

### New Capabilities

_None — this is a pure refactor with no new user-facing capabilities._

### Modified Capabilities

- `workflow-plan-resolution`: The `when`-condition matching now uses a two-source lookup (context → config) instead of a single merged object. `checkWhen` returns specificity count (`number`) instead of `boolean`. New exported functions: `lookup`, `resolveFiles`, `buildRuntimeContext`, `buildEnrichedConfig`. Removed: `buildWhenContext`.

## Impact

- `packages/storybook-addon-designbook/src/workflow-resolve.ts` — rewritten when-matching and file resolution
- `packages/storybook-addon-designbook/src/validators/__tests__/workflow-resolve.test.ts` — 21 new tests added (62 total, all passing)
- No breaking changes to external API (`resolveTaskFile`, `matchRuleFiles`, `resolveAllStages`, `resolveWorkflowPlan` signatures unchanged)
- No dependency changes
