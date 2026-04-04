## Implementation

- [x] **T1: Replace `generateTaskId()` with hash-based generation**
  - File: `packages/storybook-addon-designbook/src/workflow-resolve.ts` (lines 575-602)
  - Replace param-value suffix with 6-char hex hash from `crypto.createHash('sha256').update(step + JSON.stringify(params) + index).digest('hex').slice(0, 6)`
  - Keep step basename as prefix: `<basename>-<hash>`
  - Update deduplication logic in `cli.ts` (lines 507-514) — no longer needed since index is part of hash input

- [x] **T2: Return `expanded_tasks` in intake done RESPONSE**
  - File: `packages/storybook-addon-designbook/src/cli.ts` (lines 669-685)
  - After `runPlanLogic()`, build `expanded_tasks` array from `planResult.tasks` with `{ id, step, stage, title }`
  - Include in RESPONSE JSON on the `stage !== 'intake'` transition line

- [x] **T3: Update tests**
  - File: `packages/storybook-addon-designbook/src/validators/__tests__/workflow-resolve.test.ts` (lines 467-487)
  - Update `generateTaskId` tests to expect `<step>-<hash>` format instead of `<step>-<paramValue>`
  - Add test: same step + different params produce different hashes
  - Add test: same step + same params + different index produce different hashes

- [x] **T4: Update `workflow-execution.md`**
  - File: `.agents/skills/designbook/resources/workflow-execution.md`
  - Phase 2 "Task ID Convention": replace `<step>-<param_value>` docs with hash-based IDs
  - Add instruction to capture IDs from `expanded_tasks` in intake response
  - Update example code blocks to show `expanded_tasks` parsing

## Verification

- [x] Run `pnpm check` from repo root
- [x] Run vision workflow in test workspace — verify hash IDs appear and `write-file` works with them
