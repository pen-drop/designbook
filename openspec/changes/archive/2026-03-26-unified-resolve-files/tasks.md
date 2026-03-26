## 1. Core when-matching primitives

- [x] 1.1 Add `lookup(key, context, config)` — context-first lookup with dot-path fallback
- [x] 1.2 Refactor `checkWhen(when, context, config)` to return `number | false` with two-source lookup
- [x] 1.3 Add `buildRuntimeContext(stage?, extraConditions?)` — stage-only context builder
- [x] 1.4 Add `buildEnrichedConfig(config)` — config + DESIGNBOOK_* vars + normalized extensions

## 2. Unified file resolution

- [x] 2.1 Add `ResolvedFile` interface and `resolveFiles(glob, context, config, agentsDir)` function
- [x] 2.2 Rewrite `resolveTaskFile` as thin wrapper — named-stage fast path + `resolveFiles` + pick most specific
- [x] 2.3 Rewrite `matchRuleFiles` as thin wrapper — `resolveFiles` + return all paths

## 3. Cleanup

- [x] 3.1 Remove `buildWhenContext` and `RuleFileFrontmatter` type (no longer needed)
- [x] 3.2 Verify all existing tests pass (41 tests)

## 4. Tests

- [x] 4.1 Add `lookup` tests — context priority, config flat key, dot-path traversal, missing key
- [x] 4.2 Add `checkWhen` tests — scalar match, array inclusion, specificity count, failure cases
- [x] 4.3 Add `resolveFiles` tests — glob filtering, unconditional files, context+config separation
- [x] 4.4 Add `buildRuntimeContext` tests — empty, with stage, with extraConditions
- [x] 4.5 Add `buildEnrichedConfig` tests — config values, DESIGNBOOK_* vars, extensions normalization
