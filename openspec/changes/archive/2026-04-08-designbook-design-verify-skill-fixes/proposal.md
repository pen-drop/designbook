## Why

The `--research` audit of the `design-verify` workflow revealed 7 friction points during execution, including 4 critical issues. Three task files reference a non-existent Playwright CLI flag (`--selector`), one task references a non-existent CLI command (`_debo resolve-url`), the `playwright-session` rule is based on a non-existent tool (`playwright-cli`), and the `recapture` step loads no rules despite doing the same work as `capture`. Additionally, `workflowDone` auto-completes tasks whose file paths contain unresolved placeholders, causing the configure stage to complete without any actual work being done.

## What Changes

### Skill files (6 files)

1. **Centralize capture logic in rule** — Rename `playwright-session.md` → `playwright-capture.md`. Rewrite as the single source of truth for how screenshots are captured: full-page via CLI, element via Node API. Remove all `playwright-cli` session references.

2. **Remove inline Playwright commands from tasks** — Strip bash blocks from `capture-reference.md`, `capture-storybook.md`, and `polish.md`. Tasks declare only WHAT is captured (output paths, params). The `playwright-capture` rule provides the HOW.

3. **Fix CLI command in configure-meta-scene** — Replace `_debo resolve-url --scene` with `_debo story --scene` in `configure-meta-scene.md` Step 1.

4. **Add `recapture` to rule `when.steps`** — Update `playwright-capture.md` and `guidelines-context.md` to include `recapture` in their `when.steps` arrays so rules are loaded during the polish stage's recapture step.

5. **Remove duplicate re-capture logic from polish.md** — Since `recapture` is now a separate step (handled by `capture-storybook.md`), remove Step 2d (re-capture) from `polish.md`. Polish should focus on code fixes only.

### CLI fix (1 file)

6. **Fix placeholder auto-complete bug** — In `workflowDone` (`workflow.ts`), tasks with unresolved placeholder paths (`{storyId}`) are skipped by validation, causing them to pass even when no file was written. Add a check: if ALL file paths contain unresolved placeholders, the task should NOT be auto-completable — require at least one resolved file or explicit `--force`.

### CLI expansion fix (1 file)

7. **Allow `--params` on already-done tasks** — In the `done` handler (`cli.ts`), when `--params` is provided and the task is already done, still run `expandDeferredStages` and return success instead of erroring. This allows the AI to expand deferred stages from any completed task without needing to predict which task completes last.

## Capabilities

### Modified Capabilities
- `playwright-capture`: Fix element screenshot instructions across all capture-related tasks
- `rule-loading`: Ensure recapture step gets the same rules as capture step
- `workflow-done-validation`: Prevent auto-completion of tasks with only placeholder paths

## Impact

- Skill files: `.agents/skills/designbook/design/tasks/` (4 files), `.agents/skills/designbook/design/rules/` (2 files)
- CLI: `packages/storybook-addon-designbook/src/workflow.ts`, `packages/storybook-addon-designbook/src/cli.ts`
- No workflow definition changes — stage structure remains the same
