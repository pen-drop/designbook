## Context

Currently `workflow plan` creates a plain `/tmp/designbook-[id]/` directory, remaps `DESIGNBOOK_OUTPUTS_*` env vars to point there, and `workflow done` (final task) copies all files back with `commitWorktree` (copy + touch + rm). This was chosen over git worktrees because the original concern was that `git worktree add HEAD` starts from committed state and misses uncommitted `reads:` files.

This design replaces that with a full git worktree lifecycle: pre-flight commit check, branch isolation, preview Storybook, test stage, and explicit user-controlled merge.

## Goals / Non-Goals

**Goals:**
- Replace `/tmp` mkdir + manual copy with `git worktree add` + user-controlled merge
- Maintain identical agent behavior (agents still write to paths from `tasks.yml`)
- Pre-flight commit check ensures worktree starts with complete state (eliminates seeding problem)
- Visual preview before merge via extra-port Storybook
- Automated test stage (visual diff, stitch) before merge prompt
- User controls when changes land — no auto-merge

**Non-Goals:**
- Conflict resolution UI (merge conflicts abort with a clear error)
- Rollback / undo (git history provides this manually)
- Running Storybook build/start as part of normal per-task flow

## Decisions

### Decision: `outputs.root` replaces `drupal.theme`

**Chosen:** New `outputs.root` config key → `DESIGNBOOK_OUTPUTS_ROOT` env var. `drupal.theme` is dissolved.

**Rationale:** `drupal.theme` was Drupal-specific naming for what is really "the project subdirectory containing all outputs". `outputs.root` is the natural home — it's the common ancestor of all `outputs.*` paths, framework-agnostic, and consistent with the `DESIGNBOOK_OUTPUTS_*` naming convention.

**Migration:** All references to `DESIGNBOOK_DRUPAL_THEME` → `DESIGNBOOK_OUTPUTS_ROOT`. The `drupal.theme` key is removed from config parsing.

---

### Decision: Pre-flight commit check before worktree creation

**Chosen:** Before `git worktree add`, check `git status -- <outputs.root>` for uncommitted changes. If dirty, prompt the user to commit (via agent conversation). If user declines, abort `workflow plan`.

**Rationale:** A clean committed state before worktree creation means the worktree starts with all files (committed = present in any branch checkout). This eliminates the sparse-checkout + seeding complexity entirely. Reads: dependencies (data-model.yml, etc.) are in the worktree because they're committed.

**Alternative considered:** Skip pre-flight check, use sparse checkout + seeding. Rejected: complex, fragile, requires `getUncommittedPaths` filtering.

---

### Decision: Full checkout replaces sparse checkout

**Chosen:** `git worktree add $DESIGNBOOK_WORKSPACES/designbook-<name> -b workflow/<name>` — full checkout, no `--no-checkout`, no `sparse-checkout set`.

**Rationale:** Pre-flight commit ensures all files are committed. A full checkout of the new branch gives a complete working tree. No need to know which subtree to materialize.

**Alternative considered:** Sparse checkout of `outputs.root`. Rejected: unnecessary complexity once pre-flight commit is in place.

---

### Decision: No auto-merge — explicit `workflow merge` command

**Chosen:** `workflow done` (final task) commits outputs to the worktree branch and starts the preview, but does NOT merge. A separate `workflow merge <name>` CLI command merges after user approval.

**Rationale:** User should see the result before it lands. Multiple workflows can run in parallel branches (`workflow/debo-design-shell`, `workflow/debo-hero`) and be merged independently when ready. Auto-merge removes the review gate and prevents parallel execution.

**Migration:** `commitWorktree` kept as fallback for `tasks.yml` without `worktree_branch`.

---

### Decision: Preview Storybook at extra port

**Chosen:** After final task commit, start `storybook dev --port <preview_port>` pointing at the worktree's `storybook_root` equivalent. Store `preview_port` and `preview_pid` in `tasks.yml`.

**Rationale:** Visual verification before merge. The preview points at the worktree files, so it reflects exactly what will be merged. Test stages can use `DESIGNBOOK_PREVIEW_URL` to run visual tests.

**Command:** Use `storybook_cmd` from config with `--port <preview_port>` appended.

**Port:** `storybook_preview_port` from config (default `6010`). Fixed — no auto-detection.

**Cleanup:** Preview process is killed by `workflow merge` or `workflow abandon-preview`.

---

### Decision: Test stage — skill-declared tasks with `type: test`

**Chosen:** Skills can declare tasks with `type: test` (e.g., `designbook-stitch:test`). Test tasks are collected at plan time but run after all non-test tasks are complete. They receive `DESIGNBOOK_PREVIEW_URL`.

**Rationale:** Automated quality gate before the merge prompt. A stitch testing skill can screenshot changed scenes, a visual diff skill can compare against baseline. Test stages are optional — if none declared, the workflow proceeds directly to merge prompt.

**Sequencing:** Non-test tasks → final task commit → preview start → test tasks → user approval.

---

### Decision: User approval via agent conversation, not terminal prompt

**Chosen:** After tests pass (or if no test stage), the CLI outputs a structured status message. The AI agent presents this to the user in the conversation. User says "merge" → agent runs `workflow merge <name>`.

**Rationale:** The CLI runs non-interactively (called by the AI agent). The natural interaction point is the conversation where the user is already present. This also allows the user to ask follow-up questions before merging.

**`workflow merge` command:** `git merge --no-ff workflow/<name>`, kill preview process, `git worktree remove`, `git branch -d`.

---

### Decision: `git merge --no-ff` for merge back

**Chosen:** `git merge --no-ff workflow/<name>` in the main working tree.

**Rationale:** `--no-ff` creates a merge commit even for fast-forwards, preserving the workflow branch as a named point in history. Makes it easy to see "this commit = workflow X ran."

---

## Risks / Trade-offs

- **Pre-flight declines** → Workflow aborted. User must commit (or stash) manually. Clear error message.
- **Storybook start fails** → Preview step fails with a clear error; branch is committed and available. User can start Storybook manually.
- **Merge conflict** → `workflow merge` fails with a clear error. Branch and worktree are kept. User resolves manually.
- **Multiple worktrees** → Git allows multiple worktrees; no conflict between parallel workflow branches.
- **Large repo** → Full checkout materializes the whole repo in `/tmp`. May be slow for very large repos. Acceptable for current use case.

## Migration Plan

1. `config.ts`: add `outputs.root` parsing → `DESIGNBOOK_OUTPUTS_ROOT`; remove `drupal.theme` ✓ (done)
2. `workflow.ts`: add `createGitWorktree` (full, no sparse) ✓ (done — update to remove sparse)
3. `workflow.ts`: add `preflightCommit(rootDir, outputsRoot)` — check dirty + commit
4. `workflow.ts`: remove auto-merge from `_workflowDoneInner`; add commit-only step
5. `workflow.ts`: add `workflowMerge(dist, name)` — merge + cleanup + kill preview
6. `cli.ts` (`workflow plan`): pre-flight check before `createGitWorktree`
7. `cli.ts`: new `workflow merge` command
8. `cli.ts` (`workflow done`, final): commit outputs, start preview, run test stage, emit review status
9. Preview: start Storybook dev at extra port, store PID in `tasks.yml`
10. Test stage: collect `type: test` tasks at plan time; run after non-test tasks complete
11. Tests: update existing + add new for pre-flight, preview, test stage, merge command
