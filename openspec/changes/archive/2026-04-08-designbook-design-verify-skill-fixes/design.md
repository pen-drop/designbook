## Context

The `design-verify` workflow was added to enable visual testing of existing scenes against design references. A `--research` audit after the first full execution revealed 7 friction points — 4 critical — caused by incorrect CLI references in skill files, an obsolete rule, missing rule loading, and a CLI bug that auto-completes tasks with unresolved file paths.

The skill files reference `npx playwright screenshot --selector` which does not exist, `_debo resolve-url` which does not exist, and `playwright-cli` which does not exist. These are not edge cases — they block every execution of the capture, compare, and polish steps.

## Goals / Non-Goals

**Goals:**
- Fix all invalid CLI/tool references in design-verify task and rule files
- Ensure recapture step loads the same rules as capture step
- Remove duplicated re-capture logic from polish task (now handled by recapture step)
- Fix workflowDone auto-complete bug for tasks with placeholder-only paths
- Allow `--params` on already-completed tasks for deferred stage expansion

**Non-Goals:**
- Restructuring the design-verify workflow stages
- Adding new steps or tasks
- Changing the loop mechanism

## Decisions

### D1: Centralize capture logic in renamed rule

Playwright CLI (`npx playwright screenshot`) supports `--full-page` but has NO `--selector` flag. For element-level captures, the Node API (`page.locator(selector).screenshot()`) is the only option. Currently this logic is duplicated across 3 task files — each containing inline bash blocks.

**Decision:** Rename `playwright-session.md` → `playwright-capture.md` and centralize the capture HOW there: full-page via CLI, element via Node API. Remove all inline Playwright commands from task files (capture-reference, capture-storybook, polish). Tasks declare only WHAT is captured (paths, params). The rule provides the method.

**Alternative considered:** Keep capture logic in tasks. Rejected — violates the 4-level model (tasks = WHAT, rules = HOW constraints) and forces 3+ file updates when the capture approach changes.

### D3: WorkflowDone placeholder validation

Currently, `workflowDone` skips validation for files with unresolved placeholders (`{storyId}`). This means tasks with ONLY placeholder paths auto-complete without any work being done.

**Decision:** Add a guard: if ALL file paths have unresolved placeholders AND no file has `validation_result` or exists on disk, reject the task. Tasks with a mix of resolved and unresolved paths continue to work as before (unresolved ones are skipped, resolved ones are validated).

### D4: Allow --params on done tasks

The `done` handler currently errors when the task is already done, even if `--params` was provided. But `expandDeferredStages` runs BEFORE the done check, so the expansion already happened as a side-effect — the error is misleading.

**Decision:** When `--params` is provided and the task is already done, run `expandDeferredStages`, skip the `workflowDone` call, and return success with `expanded_tasks`. This makes the expansion a first-class operation rather than a side-effect.

## File Map

| File | Change |
|------|--------|
| `.agents/skills/designbook/design/tasks/capture-reference.md` | Remove inline Playwright commands, keep output declarations |
| `.agents/skills/designbook/design/tasks/capture-storybook.md` | Remove inline Playwright commands, keep output declarations |
| `.agents/skills/designbook/design/tasks/polish.md` | Remove Step 2d (re-capture logic) |
| `.agents/skills/designbook/design/tasks/configure-meta-scene.md` | Fix `_debo resolve-url` → `_debo story` |
| `.agents/skills/designbook/design/rules/playwright-session.md` | Rename → `playwright-capture.md`, full rewrite, add `recapture` to when.steps |
| `.agents/skills/designbook/design/rules/guidelines-context.md` | Add `recapture` to when.steps |
| `packages/storybook-addon-designbook/src/workflow.ts` | Placeholder validation guard |
| `packages/storybook-addon-designbook/src/cli.ts` | Allow --params on done tasks |
