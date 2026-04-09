## Why

The current WORKTREE uses a plain `/tmp` directory with a manual `commitWorktree` copy step at the end. Git worktrees provide proper branch isolation, a clean audit trail, and a natural review gate — the AI commits its work to a named branch, a preview Storybook starts automatically, optional test stages run, and the user decides when to merge.

## What Changes

- **NEW** `outputs.root` config key → `DESIGNBOOK_OUTPUTS_ROOT` env var — the project subdirectory containing all outputs
- **REMOVED** `drupal.theme` config key — dissolved into `outputs.root` (same path, framework-agnostic name)
- **NEW** Pre-flight commit check at `workflow plan` time — if uncommitted changes exist under `outputs.root`, the user is prompted to commit them; if they decline, the plan is aborted
- **REMOVED** sparse checkout — full checkout used instead (pre-flight commit ensures the worktree starts with complete state, eliminating the seeding problem)
- **REMOVED** `/tmp` directory creation in `workflow plan`
- **REMOVED** `commitWorktree` copy+touch+rm logic in `workflow done`
- **NEW** `git worktree add $DESIGNBOOK_WORKSPACES/designbook-[name] -b workflow/[name]` at plan time
- **SIMPLIFIED** `seedWorktree` — only uncommitted files need seeding (and only when pre-flight commit was skipped or not applicable)
- **NEW** `workflow done` (final task): stage + commit output files to worktree branch, start preview Storybook, run test stage (if declared), prompt user via agent conversation
- **NEW** `workflow merge <name>` CLI command — explicit merge triggered by user after review
- **NEW** Preview Storybook — started using `storybook_cmd` at `storybook_preview_port` (default `6010`) after final task; port and PID stored in `tasks.yml`
- **NEW** Test stage — skills can declare `type: test` tasks that run against `DESIGNBOOK_PREVIEW_URL`
- **MODIFIED** `tasks.yml`: `worktree_branch`, `preview_port`, `preview_pid` added

## Capabilities

### New Capabilities

- `git-worktree-workflow`: Git worktree lifecycle — pre-flight commit check, full checkout, seed uncommitted reads, commit outputs, start preview, run tests, merge on user approval.
- `pre-flight-commit`: Check and commit uncommitted changes under `outputs.root` before creating the worktree branch.
- `preview-storybook`: Start a Storybook dev server at an extra port pointing at the worktree, enabling visual review and automated testing before merge.
- `test-stage`: Skill-declared test tasks that run after non-test tasks complete, with access to `DESIGNBOOK_PREVIEW_URL`.
- `user-approval-merge`: After tests pass, the agent presents results and waits for user confirmation before merging the workflow branch.

### Modified Capabilities

- `designbook-configuration`: new `outputs.root` key; `drupal.theme` dissolved.
- `workflow-plan-resolution`: WORKTREE creation changes from `mkdir /tmp` to pre-flight check + `git worktree add`; `worktree_branch` stored in `tasks.yml`.
- `touch-after-done`: Touch step removed — `git merge` updates mtimes automatically; no touch needed for worktree path.

## Impact

- `designbook.config.yml`: `outputs.root` replaces `drupal.theme`
- `packages/storybook-addon-designbook/src/config.ts`: parse `outputs.root`, remove `drupal.theme` references
- `packages/storybook-addon-designbook/src/workflow.ts`: add `createGitWorktree`, `preflightCommit`, `mergeWorktree`; update `workflowPlan`, `_workflowDoneInner`; add `workflowMerge`
- `packages/storybook-addon-designbook/src/cli.ts`: `workflow plan` uses pre-flight check + full git worktree; `workflow merge` new command; `workflow done` starts preview + triggers test stage
- `tasks.yml` format: new `worktree_branch`, `preview_port`, `preview_pid` fields
- All places referencing `DESIGNBOOK_DRUPAL_THEME` → `DESIGNBOOK_OUTPUTS_ROOT`
