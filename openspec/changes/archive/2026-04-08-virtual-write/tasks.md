## 1. Config: outputs

- [x] 1.1 Add `outputs` section to `designbook.config.yml` schema — defines write-capable path prefixes (`config`, `components`, `css`, etc.)
- [x] 1.2 CLI `buildEnvMap()` in `workflow-resolve.ts`: expose `outputs.*` as `DESIGNBOOK_OUTPUTS_<KEY>` env vars (e.g. `outputs.config` → `DESIGNBOOK_OUTPUTS_CONFIG`)
- [x] 1.3 Rename all existing `DESIGNBOOK_DIST` references in task files to `DESIGNBOOK_OUTPUTS_CONFIG`, `DESIGNBOOK_COMPONENT_SRC` to `DESIGNBOOK_OUTPUTS_COMPONENTS`
- [x] 1.4 Document `outputs` in `designbook.config.yml` reference docs

## 2. CLI: workflow plan — WORKTREE setup

- [x] 2.1 Add `write_root` field to `WorkflowFile` schema in `workflow-types.ts`
- [x] 2.2 Read `DESIGNBOOK_WORKSPACES` env var (default `/tmp`), create WORKTREE at `$DESIGNBOOK_WORKSPACES/designbook-[workflow-id]/`
- [x] 2.3 Remap all `outputs.*` env vars to WORKTREE at plan time: `DESIGNBOOK_OUTPUTS_CONFIG = WORKTREE/designbook`, `DESIGNBOOK_OUTPUTS_COMPONENTS = WORKTREE/components`, etc.
- [x] 2.4 `files:` paths expand using remapped vars → already point to WORKTREE, no further transformation needed
- [x] 2.5 `reads:` paths expand using real (non-remapped) vars → always point to real DESIGNBOOK_ROOT

## 3. CLI: workflow validate — resolve against WORKTREE

- [x] 3.1 `workflowValidate()`: file paths already point to WORKTREE (via remapped vars) — no extra resolution needed
- [x] 3.2 Fallback: if `write_root` not set, vars stay as real paths (backward compat)

## 4. CLI: workflow done — bulk copy + touch + cleanup

- [x] 4.1 Detect final task: no tasks remain with `pending` or `in-progress` after this one
- [x] 4.2 On final task: `cp -r write_root/* DESIGNBOOK_ROOT/`
- [x] 4.3 Touch all copied files (update mtime) → Storybook HMR trigger
- [x] 4.4 Remove WORKTREE: `rm -rf write_root`
- [x] 4.5 Remove existing per-task touch from `workflowDone()` (replaced by bulk touch)

## 5. Docs

- [x] 5.1 Update `.agents/skills/designbook/resources/architecture.md` — document WORKTREE lifecycle, targets remapping, DESIGNBOOK_WORKSPACES
- [x] 5.2 Update `.agents/skills/designbook/resources/task-format.md` — document that `files:` use target vars, `reads:` use real paths

## 6. Tests

- [x] 6.1 `workflow-resolve.test.ts`: targets vars remapped to WORKTREE in `files:`, not in `reads:`
- [x] 6.2 `workflow.test.ts`: `workflowPlan()` creates WORKTREE, stores `write_root`
- [x] 6.3 `workflow.test.ts`: `workflowValidate()` resolves against WORKTREE paths
- [x] 6.4 `workflow.test.ts`: `workflowDone()` non-final — no copy, no touch
- [x] 6.5 `workflow.test.ts`: `workflowDone()` final — files copied, mtime updated, WORKTREE removed
- [x] 6.6 `workflow.test.ts`: `DESIGNBOOK_WORKSPACES` override — WORKTREE in custom dir

## 7. Specs archive

- [x] 7.1 `openspec/specs/virtual-write-workspace/spec.md` — create from change delta
- [x] 7.2 `openspec/specs/workflow-plan-resolution/spec.md` — merge delta
- [x] 7.3 `openspec/specs/touch-after-done/spec.md` — merge delta
