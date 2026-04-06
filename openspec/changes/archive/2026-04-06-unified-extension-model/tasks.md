## Implementation Tasks

- [x] **Task 1: Add `name`, `as`, `priority` frontmatter parsing to CLI** — `deriveArtifactName()` and `resolveShortName()` in `workflow-resolve.ts`. Derives `<skill>:<concern>:<artifact>` from path, supports explicit `name`, blueprint legacy `type+name`. Tests: 19 new tests in `workflow-resolve.test.ts`.
- [x] **Task 2: Implement multi-task resolution in `workflow create`** — `deduplicateByNameAs()` in `workflow-resolve.ts`. Groups by name/as, priority wins, sorts by priority. 9 new tests.
- [x] **Task 3: Implement short-name resolution** — `resolveShortName()` wired into `deduplicateByNameAs()`. Short names resolved using skill from file path. 3 tests.
- [x] **Task 4: Add CLI warning for unknown `as` targets** — Integrated in `deduplicateByNameAs()`. Warns and falls back to additive. Tested.
- [x] **Task 5: Update workflow execution for multi-task steps** — `resolveTaskFilesRich()` with deduplication. `resolveAllStages()` refactored to use it.
- [x] **Task 6: Create visual pipeline task files** — Added `name`/`priority` to storybook-preview (5), screenshot (10), resolve-reference (20), visual-compare (50), polish (50).
- [x] **Task 7: Create playwright-cli inspect task** — New `inspect-storybook.md` (prio 10) with playwright-cli session-based extraction.
- [x] **Task 8: Create shared rules for visual pipeline** — New `playwright-session.md`, `screenshot-storage.md`, `inspect-format.md` rules with `name` frontmatter.
- [x] **Task 9: Create stitch extension tasks** — `screenshot-stitch.md` (as: resolve-reference, prio 30), `inspect-stitch.md` (additive, prio 30) in designbook-stitch/tasks/.
- [x] **Task 10: Update compare task to consume inspect data** — Added Step 4 to load `inspect-*.json` files with graceful degradation.
- [x] **Task 11: Update architecture documentation** — Updated `architecture.md` (unified extension model section, multi-task resolution) and `task-format.md` (name/as/priority frontmatter).

## Execution Order

1. Tasks 1–4 (CLI frontmatter + resolution) — foundation
2. Task 5 (multi-task execution) — depends on 1–2
3. Tasks 6–8 (visual pipeline files + rules) — can start after 1
4. Tasks 9–10 (stitch extension + compare update) — depends on 6–8
5. Task 11 (docs) — last
