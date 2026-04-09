## 1. Engine Interface & Types

- [x] 1.1 Create `WorkflowEngine` interface and `EngineSetupResult` type in `workflow.ts`: `setup()` returns `{ envMap, write_root?, worktree_branch? }`, plus `commit()`, `merge()`, `cleanup()` methods
- [x] 1.2 Implement `git-worktree` engine: `setup()` runs preflight + `createGitWorktree` + returns `buildWorktreeEnvMap()`; `commit()` stages + commits to branch; `merge()` squash-merges; `cleanup()` removes branch
- [x] 1.3 Implement `direct` engine: `setup()` returns `buildEnvMap()` as-is (no path remapping); `commit()`, `merge()`, `cleanup()` are noops (`merge()` throws)
- [x] 1.4 Create engine registry: `const engines: Record<string, WorkflowEngine>` with both built-in engines
- [x] 1.5 Add `engine?: 'git-worktree' | 'direct'` field to `WorkflowFile` interface
- [x] 1.6 Add `engine?: string` to `WorkflowFrontmatter` type in `workflow-resolve.ts`

## 2. Dead Code Removal

- [x] 2.1 Delete `commitWorktree()` function from `workflow.ts` (logic now in `git-worktree` engine)
- [x] 2.2 Delete deprecated `mergeWorktree()` function from `workflow.ts`

## 3. Lifecycle Dispatch via Engine

- [x] 3.1 Update `workflowDone`: look up engine from `data.engine`, call `engine.commit()` instead of inline git/copy logic
- [x] 3.2 Update `workflowMerge`: look up engine, call `engine.merge()`; `direct` engine throws "nothing to merge"
- [x] 3.3 Update `workflowAbandon`: look up engine, call `engine.cleanup()`

## 4. CLI — workflow plan

- [x] 4.1 Add `--engine <name>` option to `workflow plan` command in `cli.ts`
- [x] 4.2 Read `engine:` from workflow.md frontmatter (stored in tasks.yml at create time)
- [x] 4.3 Implement engine resolution: `--engine` flag > frontmatter `engine:` > `auto` (isGitRepo → git-worktree, else direct)
- [x] 4.4 Call resolved `engine.setup()` to get `envMap` — pass this to `expandFilePaths` (replaces hardcoded `buildWorktreeEnvMap` call)
- [x] 4.5 Store `engine.setup()` results (`write_root`, `worktree_branch`) + resolved engine name via `workflowPlan()`
- [x] 4.6 Update `workflowPlan` function signature to accept `engine?: string`

## 5. CLI — workflow status merge_available

- [x] 5.1 Add `merge_available` field to `workflow status` JSON output: `true` when `engine === 'git-worktree'` AND all tasks done; `false` otherwise
- [x] 5.2 Add `engine` field to `workflow status` JSON output

## 6. Skill Resource Update

- [x] 6.1 Update `workflow-execution.md`: document optional `--engine <name>` flag on `workflow plan` call
- [x] 6.2 Document that `debo <workflow> --engine <name>` passes through to `workflow plan`
- [x] 6.3 Update merge step: check `merge_available` from `workflow status` before prompting for merge

## 7. Workflow Frontmatter

- [x] 7.1 Add `engine: direct` to `vision.md` frontmatter
- [x] 7.2 Add `engine: direct` to `tokens.md` frontmatter
- [x] 7.3 Add `engine: direct` to `css-generate.md` frontmatter
- [x] 7.4 Add `engine: direct` to `data-model.md` frontmatter
- [x] 7.5 Add `engine: direct` to `sample-data.md` frontmatter
- [x] 7.6 Add `engine: direct` to `sections.md` and `shape-section.md` frontmatter
- [x] 7.7 Add `engine: direct` to `design-guidelines.md` frontmatter
- [x] 7.8 Add `engine: git-worktree` to `design-screen.md`, `design-shell.md`, `design-component.md`, `design-test.md` frontmatter (explicit, not relying on auto)

## 8. Unit Tests (workflow.test.ts)

- [x] 8.1 Remove assertions on `commitWorktree`/`mergeWorktree` imports
- [x] 8.2 Test: `workflowDone` with `engine: direct` archives immediately when all tasks done
- [x] 8.3 Test: `workflowDone` with `engine: direct` does not call git operations
- [x] 8.4 Test: `workflowPlan` stores `engine` field in tasks.yml
- [x] 8.5 Test: `workflowMerge` throws when `engine: direct`

## 9. Integration Tests (workflow-integration.test.ts)

- [x] 9.1 Test direct engine round-trip: plan → write → done → auto-archives (no merge needed)
- [x] 9.2 Test direct engine: files[] point to real paths, no write_root in tasks.yml
- [x] 9.3 Test git-worktree engine explicit: plan with `engine: git-worktree` → same behavior as existing round-trip, `engine` field present in tasks.yml
- [x] 9.4 Test engine resolution: auto in git repo → git-worktree
- [x] 9.5 Test engine resolution: auto without git → direct
- [x] 9.6 Test engine resolution: `--engine direct` overrides auto in git repo
- [x] 9.7 Test merge_available: git-worktree + all done → true
- [x] 9.8 Test merge_available: direct + all done → false
- [x] 9.9 Test merge_available: git-worktree + tasks pending → false
