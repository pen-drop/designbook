## 1. Engine: `$ref` Resolution in `params:`

- [x] 1.1 Add `resolveParamsRef(params, taskFilePath, skillsRoot)` function in `workflow-resolve.ts` — resolve `$ref`, extract `properties` from schema, merge with explicit entries (explicit wins), error if schema has no `properties`
- [x] 1.2 Call `resolveParamsRef` in `resolveAllStages()` before `validateParamFormats()` (~line 1245) — detect `$ref` key in `params`, resolve, replace `params` with flattened result
- [x] 1.3 Extend `collectAndResolveSchemas()` to collect `$ref` from `params:` declarations (alongside existing `result:` and `each:` collection)
- [x] 1.4 Add unit tests for `resolveParamsRef`: basic resolution, override, extend, missing properties error, no `$ref` passthrough
- [x] 1.5 Add integration test: `workflow create` with a task file using `params: { $ref: ... }` — verify `expected_params` contains resolved properties
- [x] 1.6 Add integration test: `workflow create` with `params: { $ref: ..., extra: { type: string } }` — verify override and extend behavior in `expected_params`

## 2. Skill Migration: Replace Duplicated Params with `$ref`

- [x] 2.1 Migrate `sections/tasks/create-section.md` — replace `id`, `title`, `description`, `order` params with `$ref: ../schemas.yml#/Section`
- [x] 2.2 ~~Migrate `design/tasks/capture-reference.md`~~ — SKIPPED: Check schema has extra fields (`threshold`, `selector`) that would change the param surface. Migration unsafe without schema refactoring.
- [x] 2.3 ~~Migrate `design/tasks/compare-screenshots.md`~~ — SKIPPED: same reason as 2.2
- [x] 2.4 Update `resources/task-format.md` — add `$ref` in `params:` to the documented frontmatter fields with example

## 3. Verification

- [x] 3.1 Run `pnpm check` from repo root — typecheck, lint, test must all pass
- [x] 3.2 Run `./scripts/setup-workspace.sh leando` from repo root, then `/designbook sections` in the workspace — verify workflow runs without schema/param mismatch errors
