## 1. Direct Engine — Stash at Target

- [x] 1.1 Add `workflow_id` field to `WorkflowFile` — extracted from the short hex suffix of the workflow name (e.g., `a1b2` from `css-generate-2026-03-29-a1b2`) at plan time and persisted in `tasks.yml`
- [x] 1.2 Replace `stashDir()`/`stashPath()` with a `stashPath(data, task, key)` that returns `<file.path>.<workflow_id>.debo` using the task's file entry target path and `data.workflow_id`
- [x] 1.3 Update `writeFile()` to write to the new stash path (target dir, `.debo` suffix)
- [x] 1.4 Update `flush()` to rename `.<workflow_id>.debo` → final name (strip suffix) instead of cross-directory move; keep `utimesSync` batch-touch
- [x] 1.5 Remove stash directory cleanup from `flush()` (no more `stash/` subdirectory to clean)
- [x] 1.6 Update `cleanup()` to glob-delete `**/*.<workflow_id>.debo` for abandon/crash recovery

## 2. CSS Generate Workflow — Stage Split

- [x] 2.1 Update `css-generate.md` frontmatter: split into `execute: [css-generate:intake, generate-jsonata]` and `transform: [generate-css]`

## 3. Tests

- [x] 3.1 Update `workflow-write-file.test.ts` stash path expectations — `writeResult.file_path` is now `<targetPath>.<workflow_id>.debo` in the same directory, not under `stash/`
- [x] 3.2 Update flush test: assert `.debo` file renamed to final name in same directory (no cross-directory move)
- [x] 3.3 Add test: abandon/cleanup removes only files matching `*.<workflow_id>.debo`
- [x] 3.4 Add test: concurrent workflows with different `workflow_id` don't interfere
- [x] 3.5 Run `pnpm check` to verify all tests pass
