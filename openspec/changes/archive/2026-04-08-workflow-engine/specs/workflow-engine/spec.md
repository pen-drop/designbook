## ADDED Requirements

### Requirement: Workflow engine field in WorkflowFile
`WorkflowFile` SHALL include an optional `engine` field with values `'git-worktree' | 'direct'`. This field is written to tasks.yml at plan time and read by all lifecycle commands.

#### Scenario: Engine stored at plan time
- **WHEN** `workflow plan` runs
- **THEN** tasks.yml contains `engine: git-worktree` or `engine: direct`

#### Scenario: Engine absent means auto
- **WHEN** `engine` is not set in tasks.yml
- **THEN** lifecycle commands treat it as `auto` (equivalent to the pre-existing `isGitRepo` check)

---

### Requirement: Workflow frontmatter supports engine declaration
Workflow.md frontmatter SHALL accept an `engine:` key with values `git-worktree` or `direct`. This sets the per-workflow default strategy.

#### Scenario: Frontmatter engine read at plan time
- **WHEN** `workflow plan` runs for a workflow whose workflow.md declares `engine: direct`
- **THEN** the resolved engine is `direct` (assuming no `--engine` flag override)

#### Scenario: Frontmatter engine read at plan time — git-worktree
- **WHEN** `workflow plan` runs for a workflow whose workflow.md declares `engine: git-worktree`
- **THEN** the resolved engine is `git-worktree`

---

### Requirement: --engine flag overrides frontmatter
`workflow plan` SHALL accept an `--engine` flag. When provided it takes precedence over the frontmatter `engine:` value.

#### Scenario: CLI flag overrides frontmatter
- **WHEN** `workflow plan --engine git-worktree` is called for a workflow with `engine: direct` in its frontmatter
- **THEN** the stored engine in tasks.yml is `git-worktree`

#### Scenario: CLI flag overrides auto default
- **WHEN** `workflow plan --engine direct` is called for a workflow with no `engine:` in its frontmatter, running in a git repo
- **THEN** the stored engine is `direct` and no git worktree is created

---

### Requirement: Engine precedence order
The resolved engine SHALL follow: `--engine` flag > frontmatter `engine:` > `auto`.

`auto` behavior: `git-worktree` when the rootDir is a git repo; `direct` otherwise.

#### Scenario: Auto resolves to git-worktree in git repo
- **WHEN** no `--engine` flag and no frontmatter `engine:` key, and rootDir is a git repo
- **THEN** engine resolves to `git-worktree`

#### Scenario: Auto resolves to direct outside git repo
- **WHEN** no `--engine` flag and no frontmatter `engine:` key, and rootDir is not a git repo
- **THEN** engine resolves to `direct`

---

### Requirement: Engine interface with setup returning envMap
Each engine SHALL implement a `setup()` method that returns `{ envMap, write_root?, worktree_branch? }`. The `envMap` SHALL be passed to `expandFilePaths` for path resolution. This is how the engine controls where tasks write.

#### Scenario: git-worktree setup returns remapped envMap
- **WHEN** `git-worktree` engine `setup()` runs
- **THEN** it returns an `envMap` from `buildWorktreeEnvMap()` where `DESIGNBOOK_HOME`, `DESIGNBOOK_DATA`, `DESIGNBOOK_DIRS_*` point into the worktree

#### Scenario: direct setup returns real envMap
- **WHEN** `direct` engine `setup()` runs
- **THEN** it returns the unmodified `envMap` from `buildEnvMap()` where paths point to real directories

#### Scenario: envMap used for expandFilePaths
- **WHEN** `workflow plan` expands `files:` templates from task frontmatter
- **THEN** it uses the `envMap` returned by `engine.setup()`, not a hardcoded call to `buildWorktreeEnvMap`

---

### Requirement: Engine registry for dispatch
Engines SHALL be registered in a `Record<string, WorkflowEngine>` registry. All lifecycle functions (`workflowDone`, `workflowMerge`, `workflowAbandon`) SHALL look up the engine from `data.engine` and call the corresponding method. No `if/else` dispatch on `worktree_branch` presence.

#### Scenario: Adding a new engine
- **WHEN** a new engine is implemented
- **THEN** it is added to the registry as a single object implementing `setup`, `commit`, `merge`, `cleanup`
- **AND** no changes to lifecycle functions are needed

---

### Requirement: git-worktree engine behavior
When `engine: git-worktree` is resolved:
- `setup()` SHALL run a git preflight check, create a git worktree on branch `workflow/<name>`, and return `buildWorktreeEnvMap()`
- `commit()` (on last non-test task) SHALL stage + commit declared output paths to the worktree branch and remove the worktree directory
- `merge()` SHALL squash-merge the branch and archive the workflow
- `cleanup()` SHALL remove the worktree and delete the branch

#### Scenario: Git preflight blocks dirty workspace
- **WHEN** `git-worktree` engine `setup()` runs and the workspace has uncommitted changes
- **THEN** the command exits with an error listing the dirty files

#### Scenario: Worktree committed on last task done
- **WHEN** all non-test tasks are complete and `engine` is `git-worktree`
- **THEN** `engine.commit()` stages and commits output paths to the worktree branch; worktree directory is removed

---

### Requirement: direct engine behavior
When `engine: direct` is resolved:
- `setup()` SHALL return `buildEnvMap()` with no path remapping; `write_root` and `worktree_branch` are not set
- `commit()` SHALL be a noop
- `merge()` SHALL throw an error ("nothing to merge")
- `cleanup()` SHALL be a noop
- Tasks write to real paths (DESIGNBOOK_HOME etc. unchanged)
- `workflowDone` SHALL archive the workflow when all tasks complete, with no commit or merge step

#### Scenario: No worktree created for direct engine
- **WHEN** `workflow plan` resolves `direct`
- **THEN** no git worktree is created, no tmpdir is created, `write_root` is absent from tasks.yml

#### Scenario: Workflow auto-archives on done with direct engine
- **WHEN** all tasks are done and `engine` is `direct`
- **THEN** the workflow is archived immediately without requiring `workflow merge`

---

### Requirement: workflow status reports merge_available
`workflow status` SHALL include a `merge_available` field in its output. This is `true` only when `engine` is `git-worktree` AND all tasks are done.

#### Scenario: git-worktree all done
- **WHEN** `workflow status` is called and engine is `git-worktree` and all tasks are done
- **THEN** output includes `merge_available: true`

#### Scenario: direct engine all done
- **WHEN** `workflow status` is called and engine is `direct` and all tasks are done
- **THEN** output includes `merge_available: false`

#### Scenario: git-worktree not all done
- **WHEN** `workflow status` is called and engine is `git-worktree` and tasks are still pending
- **THEN** output includes `merge_available: false`

---

### Requirement: Dead copy path removed
The `commitWorktree()` and `mergeWorktree()` functions SHALL be removed from `workflow.ts`. No engine dispatches through these paths.

#### Scenario: No copy fallback code path
- **WHEN** `workflowDone` is called with `write_root` set but no `worktree_branch`
- **THEN** this state cannot occur because `direct` engine does not set `write_root`
