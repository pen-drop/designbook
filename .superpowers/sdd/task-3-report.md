# Task 3 Report: `generator:` — surface to the agent + artifact-exists check

## Artifact-check insertion

**File:** `packages/storybook-addon-designbook/src/workflow.ts`
**Function:** `validateResultEntry` (async, ~line 1983)
**Where:** New step `0a`, inserted BEFORE the existing `0b` prepare hook:

```ts
// 0a. Generator artifact check: the jsonata file must exist (agent must persist the transform)
if (entry.generator?.jsonata && !existsSync(entry.generator.jsonata)) {
  return [`generator artifact missing: ${entry.generator.jsonata}`];
}
```

`existsSync` was already imported from `node:fs` at the top of the file — no new import needed.

## Surfacing insertion

**File:** `packages/storybook-addon-designbook/src/cli/submit-results-hint.ts`
**Function:** `renderSubmitResultsHint`

Changes:
1. Added `generator?: { jsonata: string }` to the `ResultProperty` interface.
2. The function now collects a `generators` array alongside `data` and `direct`.
3. When generator entries exist, a `## Generator results` section is prepended to the output, with one line per entry:
   `- **<key>**: author a JSONata at \`<path>\` and run it to produce the result value.`
4. The early-return guard was updated: `if (data.length === 0 && generators.length === 0) return null`.

This surfacing is wired — not merely documented. The `renderSubmitResultsHint` is called from two sites:
- `buildInstructions` in `src/cli/workflow.ts` (the `workflow next`/instructions path) via `schema.result` from the SchemaBlock. Generator fields flow through `buildSchemaBlock` → `resolveEntry` because only `path`, `$ref`, and `workflow` are excluded from copy.
- `workflowDone` in `src/workflow.ts` (the direct-write rejection path) via the manually-built hint map. That map only carries `path`/`submission`/`flush`/`$ref`/`type` — it does NOT forward `generator`. Generator entries don't have `path`, so they don't appear in that hint map. This is acceptable: the direct-write rejection path is for file results only; generator results are data results and are not relevant there.

## Test red → green

New describe block: `workflow result: generator artifact check`

**Test 1 — missing artifact → invalid:**
- Sets up a task with `result: { data: { generator: { jsonata: '/tmp/does-not-exist-xyz.jsonata' }, submission: 'data', schema: { type: 'object' } } }`
- Calls `workflowResult(...)` → expects `r.valid === false` and `r.errors.join(' ')` matches `/generator|jsonata|artifact/i`
- RED: `r.valid` was `true` (no check existed)
- GREEN: after adding the artifact-exists check

**Test 2 — artifact present + data matches → valid:**
- Writes a real `.jsonata` file to tmpdir, same task shape
- Expects `r.valid === true`
- Was already GREEN (no schema violation, no missing file)

## pnpm check result

All phases green:
- `typecheck`: 0 errors
- `lint`: 0 errors (prettier fix applied via `lint:fix`)
- `test`: 96 test files, 1028 tests, all passed

## Concerns

None blocking. One minor note: the `workflowDone` direct-write hint builder (lines ~1209-1223 of workflow.ts) constructs the hint map manually from `path`/`submission`/`flush`/schema fields and does not forward `generator`. Generator entries (data results without path) are irrelevant in that code path — no gap.
