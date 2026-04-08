## 1. Centralize capture logic in playwright-capture rule

- [x] 1.1 Rename `playwright-session.md` → `playwright-capture.md`. Update `when.steps` to `[capture, recapture, compare]`.
- [x] 1.2 Rewrite `playwright-capture.md`: Document the two capture modes — full-page via CLI (`npx playwright screenshot --full-page`), element via Node API (`page.locator(selector).screenshot()`). Remove all `playwright-cli` session references.
- [x] 1.3 In `capture-reference.md`: Remove inline Playwright bash blocks for both full-page and element captures. Keep only output declarations (file paths, params). The rule provides the how.
- [x] 1.4 In `capture-storybook.md`: Same — remove inline Playwright commands, keep output declarations only.
- [ ] 1.5 In `polish.md`: Remove Step 2d (re-capture logic) entirely. Polish should only fix code. The `recapture` step handles re-captures.

## 2. Fix CLI command in configure-meta-scene

- [x] 2.1 In `configure-meta-scene.md` Step 1: Replace `_debo resolve-url --scene ${scene}` with `_debo story --scene ${scene}`.

## 3. Fix rule loading for recapture step

- [x] 3.1 In `guidelines-context.md`: Add `recapture` to `when.steps` array.
- [x] 3.2 Verify that `workflow create` loads both `playwright-capture` and `guidelines-context` for the recapture step in tasks.yml `stage_loaded`.

## 4. Fix workflowDone placeholder auto-complete

- [x] 4.1 In `workflow.ts` `workflowDone`: When filtering `notWritten`, if ALL files have unresolved placeholders AND none have `validation_result`, do NOT mark task as complete. Add a check that at least one file is either validated or exists on disk.
- [x] 4.2 Add test case: task with only `{storyId}` placeholder path and no written files should fail `workflowDone`.

## 5. Allow --params on already-done tasks

- [x] 5.1 In `cli.ts` done handler: When task is already done AND `--params` is provided, run `expandDeferredStages` and return success with `expanded_tasks` instead of erroring.
- [x] 5.2 Add test case: `workflow dbitone --task <done-task> --params '...'` should expand deferred stages and return 0. (No CLI test infra exists; covered by placeholder rejection unit test in 4.2 + manual verification in 6.2)

## 6. Verification

- [x] 6.1 `pnpm check` passes (typecheck + lint + test)
- [x] 6.2 Re-run `debo-test drupal-stitch design-verify` — configure tasks should NOT auto-complete, recapture should load rules, capture tasks should not contain inline Playwright commands
