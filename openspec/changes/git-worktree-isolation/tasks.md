## 1. Config — outputs.root / dissolve drupal.theme

- [x] 1.1 Add `outputs.root` parsing in `config.ts` → exposed as `DESIGNBOOK_OUTPUTS_ROOT`
- [x] 1.2 Remove `drupal.theme` from config parsing; update all references from `DESIGNBOOK_DRUPAL_THEME` → `DESIGNBOOK_OUTPUTS_ROOT`
- [x] 1.3 Update `designbook.config.yml` test fixture: replace `drupal.theme` with `outputs.root`

## 2. Types & Interface

- [x] 2.1 Add `worktree_branch?: string` to `WorkflowFile` interface in `workflow.ts`
- [x] 2.2 Add `preview_port?: number` and `preview_pid?: number` to `WorkflowFile` interface

## 3. Git Worktree Creation (full checkout)

- [x] 3.1 Add `createGitWorktree(worktreePath, branchName, rootDir)` to `workflow.ts` — full checkout (no `--no-checkout`, no `sparse-checkout`)
- [x] 3.2 Add `isGitRepo(dir)` helper

## 4. Pre-flight Commit Check

- [x] 4.1 Add `checkPreflightClean(rootDir, outputsRoot): { clean: boolean; files: string[] }` to `workflow.ts`
- [x] 4.2 In `cli.ts` `workflow plan`: call `checkPreflightClean` when `isGitRepo(rootDir)` and `outputs.root` is configured
- [x] 4.3 Remove `seedWorktree` call from `workflow plan`
- [x] 4.4 Remove `getUncommittedPaths`

## 5. workflow plan — full git worktree

- [x] 5.1 Update `workflow plan` to use `createGitWorktree` (full checkout, no sparse)
- [x] 5.2 Store `worktree_branch` in plan output and `tasks.yml`
- [x] 5.3 `workflowPlan()` accepts `worktreeBranch?: string`
- [x] 5.4 Remove `sparseRoot` from `createGitWorktree` signature

## 6. workflow done — commit + preview + test stage (no auto-merge)

- [x] 6.1 In `_workflowDoneInner`: when all non-test tasks done and `worktree_branch` set: commit + worktree remove (no merge)
- [x] 6.2 After commit + worktree remove: start preview Storybook (see §7) — `prepareEnvironment` in cli.ts
- [x] 6.3 After preview ready: emit test tasks ready status
- [x] 6.4 Emit review status JSON/text: branch name, preview URL, file count
- [x] 6.5 Keep `commitWorktree` (copy+touch) as fallback when `worktree_branch` absent

## 7. storybook start CLI command

- [x] 7.1 Add `storybook start` subcommand to `cli.ts` — polls `/_storybook/story-index.json`, exits when ready
- [x] 7.2 Add `storybook stop` subcommand to `cli.ts` — SIGTERM then SIGKILL after 5s
- [x] 7.3 `--port` optional on `storybook start` — auto-detects free port via OS bind when omitted; port returned in JSON output

## 8. prepare-environment lifecycle step

- [x] 8.1 `prepareEnvironment` in `cli.ts` (internal helper): starts Storybook, screenshots scenes, returns result
- [x] 8.2 `workflow prepare-environment --workflow <name> --task <id>` CLI command: calls `prepareEnvironment`, stores preview_pid/port in tasks.yml via `--loaded`, marks task done
- [x] 8.3 Include `startupErrors` in output when non-empty

## 8b. Test Stage

- [x] 8b.1 `_workflowDoneInner`: commit trigger excludes `prepare-environment` + `test` tasks
- [x] 8b.2 `_workflowDoneInner`: `preview_pid`/`preview_port`/`pre_test_screenshots` stored when passed via `loaded` payload
- [x] 8b.3 `workflow done` for final task (all done, worktree_branch set): emit review status with branch + preview URL

## 9. workflow merge — squash merge + cleanup

- [x] 9.1 Add `workflowMerge(dist, name)` to `workflow.ts`: squash merge + commit + branch delete + archive
- [x] 9.2 Add `workflow merge` CLI command to `cli.ts`

## 10. Tests

- [x] 10.1 Mock `execFileSync` for git calls in `createGitWorktree` and `mergeWorktree`
- [x] 10.2 Test: `createGitWorktree` uses full checkout (no `--no-checkout`, no `sparse-checkout`)
- [x] 10.3 Test: fallback to `commitWorktree` when `worktree_branch` absent
- [x] 10.4 Test: `checkPreflightClean` returns clean=false with file list when dirty
- [x] 10.5 Test: `checkPreflightClean` returns clean=true when no uncommitted changes
- [ ] 10.6 Test: `workflow plan` exits with code 1 when pre-flight fails (CLI acceptance test — requires spawning compiled binary)
- [x] 10.7 Test: `workflowMerge` calls `git merge --squash` + commit + branch delete
- [x] 10.8 Test: `workflowMerge` kills preview process when `preview_pid` set
- [ ] 10.9 Test: review status output includes branch name, preview URL, file count (CLI acceptance test — requires spawning compiled binary)
