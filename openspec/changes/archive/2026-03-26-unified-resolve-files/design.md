## Context

`workflow-resolve.ts` resolves task files, rule files, and config at plan time. The `when`-condition matching was duplicated between `resolveTaskFile` (for tasks) and `matchRuleFiles` (for rules), with special-case handling for `stages`, `extensions`, and `template` keys in the rule matcher. The refactor unifies file resolution into a single `resolveFiles` function and separates runtime context from project config in the when-matching.

## Goals / Non-Goals

**Goals:**
- Single `resolveFiles(glob, context, config, agentsDir)` function for all file resolution
- Two-source `when`-matching: context first, config fallback
- Dot-path traversal for forward-compatibility with non-flattened configs
- `checkWhen` returns specificity count directly (`number | false`)
- Zero new dependencies

**Non-Goals:**
- JSONPath or other query language support
- Changing the `when` syntax in rule/task frontmatter files
- Refactoring `resolveWorkflowPlan` or `resolveAllStages` beyond using the new primitives
- Changing `resolveConfigForStage` (uses rawConfig, separate concern)

## Decisions

### 1. Two-source lookup instead of merged context
Context (runtime) and config (project) are kept separate. `lookup(key, context, config)` checks context first, then config flat key, then config dot-path traversal. This eliminates `buildWhenContext` which spread everything into one object.

**Why**: The merged object lost semantic meaning — you couldn't tell if a value came from the current stage or from project config. Separate sources make the priority explicit.

### 2. `checkWhen` returns `number | false` instead of `boolean`
Specificity (count of matching keys) is the primary use case — callers always needed it alongside the boolean. Combining them avoids separate `Object.keys(when).length` calls.

### 3. Dot-path traversal as last-resort fallback
`lookup` tries flat key first (backwards-compat with flattened config), then dot-path traversal into nested objects. This is forward-compatible if `loadConfig` flattening is ever removed.

**Why not JSONPath**: All real use cases are simple key matches. JSONPath would add a dependency and make rule files harder to author for zero practical benefit.

### 4. `resolveTaskFile` and `matchRuleFiles` remain as thin wrappers
Both are still exported with unchanged signatures. `resolveTaskFile` adds the named-stage fast path and picks most-specific. `matchRuleFiles` returns all matching paths. Both delegate to `resolveFiles` internally.

**Why**: No breaking changes for `cli.ts` or tests. The wrappers are 5-10 lines each.

## Risks / Trade-offs

- **[Enriched config computed per call]** → `buildEnrichedConfig` is called in each wrapper. For `resolveAllStages` which loops over stages, this means N calls. Mitigation: The computation is trivial (object spread + string split), not worth caching.
- **[Dot-path traversal on every lookup miss]** → Extra `.split('.')` when flat key doesn't exist. Mitigation: Nearly all keys exist as flat keys in practice; the traversal is a fallback that rarely fires.
