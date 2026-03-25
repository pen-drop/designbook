## 1. Core Implementation

- [x] 1.1 In `workflow-resolve.ts`: replace the per-skill-dir loop in `matchRuleFiles` with a single glob call — `glob('skills/**/rules/*.md', { cwd: agentsDir })`. The `minimatch` package is already a dependency; use Node's built-in `fs.glob` (or `minimatch` + `readdirSync` walk) as appropriate for the Node version target.
- [x] 1.2 In `workflow-resolve.ts`: replace the per-skill-dir loop in `resolveTaskFile` (generic stage path) with a single glob call — `glob('skills/**/tasks/${stage}.md', { cwd: agentsDir })`. Named stage (`skill:task`) path remains unchanged.
- [x] 1.3 Remove now-unused `readdirSync` loop infrastructure from both functions. Update the `node:fs` import to drop `readdirSync` if no longer used elsewhere.

## 2. Tests

- [x] 2.1 Add unit test for `matchRuleFiles`: verifies a rule file at `skills/<skill>/scenes/rules/rule.md` is discovered (subdirectory above `rules/`)
- [x] 2.2 Add unit test for `resolveTaskFile` (generic stage): verifies a task file at `skills/<skill>/components/tasks/<stage>.md` is found as a candidate
- [x] 2.3 Verify existing flat-structure tests still pass (`skills/<skill>/rules/rule.md` and `skills/<skill>/tasks/<stage>.md`)
