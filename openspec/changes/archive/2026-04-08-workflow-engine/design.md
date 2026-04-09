## Context

`workflow plan` in `cli.ts` currently hardcodes the isolation strategy: if the directory is a git repo, a git worktree is always created; otherwise a plain tmpdir is used. There is no way for individual workflows to opt out or choose a different strategy.

This forces all workflows — including lightweight ones like `vision` or `tokens` — through branch isolation and a mandatory `workflow merge` step, even when direct writes are appropriate.

The `WorkflowFile` type already models optional isolation (`write_root?`, `worktree_branch?`), so the data model supports "no isolation" — the CLI just never uses it selectively.

A dead code path also exists: `commitWorktree()` (plain-copy fallback) and `mergeWorktree()` (marked deprecated). Neither is used by any active workflow.

## Goals / Non-Goals

**Goals:**
- Per-workflow write isolation strategy (`git-worktree` or `direct`)
- Declared in workflow.md frontmatter; overridable at runtime via `--engine` flag
- Remove dead copy/merge code paths
- Preserve existing behavior for workflows that declare no engine (auto default)

**Non-Goals:**
- Pluggable or user-defined engines
- A `copy` engine (plain tmpdir → copy back); this was never explicitly used
- Changing the merge or commit mechanics of the `git-worktree` engine

## Decisions

### Engine as a named field on WorkflowFile

**Decision**: Add `engine?: 'git-worktree' | 'direct'` to `WorkflowFile`. Store it in tasks.yml at `workflow plan` time. All lifecycle commands (`workflowDone`, `workflowMerge`, `workflowAbandon`) read it from `data.engine`.

**Why**: The engine must travel with the workflow so that every lifecycle command knows how to behave without re-reading the original workflow.md. Checking `data.worktree_branch` presence (current implicit dispatch) is fragile — the field means two things (branch name + strategy signal).

**Alternative considered**: Continue using `worktree_branch` presence as the dispatch signal. Rejected because it conflates naming with strategy selection.

---

### Frontmatter key + CLI flag with precedence

**Decision**: `engine:` in workflow.md frontmatter sets the per-workflow default. `--engine` CLI flag on `workflow plan` overrides it. When neither is set, `auto` applies: `git-worktree` if git repo, `direct` otherwise.

**Why**: Frontmatter keeps the strategy co-located with the workflow definition. The CLI flag allows runtime override without editing workflow files (e.g. `debo vision --engine git-worktree` for a one-off review).

**Precedence**: `--engine` flag > frontmatter `engine:` > `auto`

---

### Remove commitWorktree and mergeWorktree

**Decision**: Delete `commitWorktree()` and `mergeWorktree()` from `workflow.ts`.

**Why**: `commitWorktree()` is only reachable via the `else if (data.write_root && data.root_dir)` branch in `workflowDone`, which fires when `write_root` is set but `worktree_branch` is not. After this change, `write_root` is only set for `git-worktree` engine runs — and those always have `worktree_branch`. The branch is unreachable. `mergeWorktree()` is already marked deprecated and used only by old tests.

**Risk**: Old tasks.yml files from before this change may have `write_root` set without `worktree_branch`. These are workflow runs from the dead `copy` path — none exist in practice.

---

### Engine interface with setup() returning envMap

**Decision**: Extract engine logic into a `WorkflowEngine` interface. Each engine implements `setup()`, `commit()`, `merge()`, and `cleanup()`. Critically, `setup()` returns the `envMap` that `expandFilePaths` uses — this is how the engine controls path resolution.

```typescript
interface EngineSetupResult {
  envMap: Record<string, string>;  // passed to expandFilePaths
  write_root?: string;
  worktree_branch?: string;
}

interface WorkflowEngine {
  name: string;
  setup(ctx: EngineContext): EngineSetupResult;
  commit(data: WorkflowFile): void;
  merge(data: WorkflowFile): { branch: string; root_dir: string; preview_pid?: number };
  cleanup(data: WorkflowFile): void;
}
```

**git-worktree.setup()**: runs preflight, creates git worktree, returns `buildWorktreeEnvMap()` — paths point into worktree.

**direct.setup()**: noop, returns `buildEnvMap()` as-is — paths point to real dirs.

**Why**: The env map (path transformation) is the core engine concern — it determines where `expandFilePaths` resolves `${DESIGNBOOK_HOME}` etc. Making this explicit in the return type forces every engine to declare its path strategy. Adding a new engine = implementing one object, no scattered `if/else`.

**Registry**: `engines: Record<string, WorkflowEngine>` — looked up by resolved engine name.

---

### direct engine = no write_root

**Decision**: For `engine: direct`, `setup()` returns the unmodified `envMap` from `buildEnvMap(config)`. No `write_root` or `worktree_branch` is set. Tasks write directly to real paths. No commit or merge step.

**Why**: Avoids an unnecessary tmpdir and the complexity of seeding/copying. Direct writes are appropriate for workflows where outputs are small and low-risk, and where immediate Storybook HMR is desirable.

## Risks / Trade-offs

- **Stale tasks.yml files** — Any workflow run that was started before this change and had `write_root` set without `worktree_branch` will hit the now-deleted `commitWorktree` branch. Risk is negligible: no such workflows are in active use, and the workflow system archives completed runs.
- **Auto default changes nothing** — Workflows that don't declare `engine:` keep identical behavior. Backward compat is preserved by the `auto` fallback.
- **No copy engine** — Projects that aren't git repos fall back to `direct` (no isolation). If isolation is needed in a non-git context, this is a gap. Out of scope for now.

## Migration Plan

1. Delete `commitWorktree` and `mergeWorktree` from `workflow.ts`
2. Add `engine` field to `WorkflowFile` type
3. Update `workflowDone`, `workflowMerge`, `workflowAbandon` to dispatch on `data.engine`
4. Update `workflow plan` in `cli.ts`: add `--engine` flag, read frontmatter `engine:`, apply precedence, store result in tasks.yml
5. Update `workflow-resolve.ts` / `WorkflowFrontmatter` type to include `engine?: string`
6. Update `workflow-execution.md` skill resource to document `--engine` passthrough
7. Add `engine: direct` to workflow.md files that don't need isolation (vision, tokens, css-generate, data-model, sample-data, sections)

No migration of existing tasks.yml files needed — old runs are already archived.
