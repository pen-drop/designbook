## 1. Type System & Data Model

- [x] 1.1 Update `TaskFile` interface in `workflow-types.ts` — add `key: string`, `validators: string[]`; remove `requires_validation`; state derived from `validation_result` presence
- [x] 1.2 Update `TaskFileFrontmatter` interface in `workflow-resolve.ts` — change `files` from `string[]` to `Array<{ file: string; key: string; validators?: string[] }>`
- [x] 1.3 Update file parsing in `workflow-resolve.ts` `expandFilePaths()` to handle structured objects — expand `file` field, pass through `key` and `validators`

## 2. Validator Registry Refactor

- [x] 2.1 Create validator key lookup map in `validation-registry.ts` — `Record<string, ValidatorFn>` replacing `ValidationRegistry` class and `minimatch`
- [x] 2.2 Add validator key validation to `workflow plan` — reject unknown keys at plan time
- [x] 2.3 Remove `ValidationRegistry` class, `minimatch` dependency, and glob-based matching code
- [x] 2.4 Remove `applyConfigExtensions` glob-based extension or migrate to key-based registration

## 3. Engine writeFile Interface

- [x] 3.1 Add `writeFile(task, key, content): { path }` and `flush(tasks)` to engine interface in `engines/types.ts`
- [x] 3.2 Implement `writeFile` in `engines/direct.ts` — write to stash `workflows/changes/<workflow>/stash/<task-id>/<key>`, return `{ path }`
- [x] 3.3 Implement `writeFile` in `engines/git-worktree.ts` — write directly to resolved WORKTREE target path, return `{ path }`
- [x] 3.4 Implement `flush` in `engines/direct.ts` — mv stash → target, utime batch, rm stash dir
- [x] 3.5 Implement `flush` in `engines/git-worktree.ts` — no-op
- [x] 3.6 Wire flush into stage transition in `workflow-lifecycle.ts` — call `engine.flush()` when stage completes

## 4. Write-File CLI Command

- [x] 4.1 Add `workflow write-file <workflow> <task-id> --key <key>` command to `cli.ts`
- [x] 4.2 Implement stdin reading
- [x] 4.3 Call `engine.writeFile(task, key, content)` — use returned `{ path }` for validation
- [x] 4.4 Validate centrally: lookup validators by key, run against returned path
- [x] 4.5 Update task state in tasks.yml — set `validation_result` (state derived from its presence)
- [x] 4.6 Output JSON result to stdout: `{ valid, errors, file_path }`
- [x] 4.7 Handle error cases: unknown key, empty stdin, missing workflow/task

## 5. Refactor workflow done to gate-check

- [x] 5.1 Refactor `workflowDone()` in `workflow.ts` — remove all validation logic, only assert: every file has `validation_result`, every `validation_result.valid === true`
- [x] 5.2 Remove `requires_validation` checks from `workflowDone()` — no longer needed, state derived from `validation_result` presence
- [x] 5.3 Update error messages: "file `<key>` not yet written" (no validation_result) and "file `<key>` has errors: ..." (valid === false)

## 6. Cleanup Old Code

- [x] 6.1 Remove `workflow add-file` command from `cli.ts` and `workflowAddFile()` from `workflow.ts`
- [x] 6.2 Remove `workflow validate` command from `cli.ts` and `workflowValidate()` from `workflow.ts`
- [x] 6.3 Remove `touchTaskFiles()` from `workflow.ts` (replaced by engine flush utime)
- [x] 6.4 Remove `requires_validation` field from `TaskFile` interface and all code that reads/writes it
- [x] 6.5 Remove step files (none exist) (`steps/add-files.md`, `steps/validate.md`) if they exist
- [x] 6.6 Remove `validation` field from `WorkflowTask` type (old validators-run-during-validate tracking)

## 7. Addon / Storybook Panel Updates

- [ ] 7.1 Update `Panel.tsx` `TaskFile` type — remove `requires_validation`, add `key`, `validators`
- [ ] 7.2 Update file status color logic in `Panel.tsx` — derive from `validation_result` only (absent=gray, valid=green, invalid=yellow)
- [ ] 7.3 Update Panel file display to show `key` instead of or alongside path
- [ ] 7.4 Remove any Panel references to `workflow validate` or `add-file` commands
- [ ] 7.5 Update `vite-plugin.ts` if `resolveFileType` logic relies on glob patterns that are being removed

## 8. Update Existing Tests

- [ ] 8.1 Update `workflow-files.test.ts` — remove `requires_validation` assertions, test `validation_result` state derivation
- [ ] 8.2 Update `workflow-integration.test.ts` — adapt to new write-file flow instead of add-file + validate
- [ ] 8.3 Update `workflow.test.ts` — adapt `workflowDone` tests to gate-check-only behavior
- [ ] 8.4 Update `workflow-resolve.test.ts` — test structured file declaration parsing
- [ ] 8.5 Update `builder-registry.test.ts` and `parser.test.ts` if affected by type changes

## 9. Task File Migration

- [ ] 9.1 Migrate `designbook/tokens/tasks/create-tokens.md` — structured files + write-file in body
- [ ] 9.2 Migrate `designbook/data-model/tasks/create-data-model.md`
- [ ] 9.3 Migrate `designbook/design/tasks/create-guidelines.md`
- [ ] 9.4 Migrate `designbook/vision/tasks/create-vision.md`
- [ ] 9.5 Migrate `designbook/sample-data/tasks/create-sample-data.md`
- [ ] 9.6 Migrate `designbook/sections/tasks/create-section.md`
- [ ] 9.7 Migrate `designbook/design/tasks/create-scene--design-screen.md`
- [ ] 9.8 Migrate `designbook/design/tasks/create-scene--design-shell.md`
- [ ] 9.9 Migrate `designbook/design/tasks/map-entity--design-screen.md`
- [ ] 9.10 Migrate `designbook-css-tailwind/tasks/create-tokens.md`
- [ ] 9.11 Migrate `designbook-css-tailwind/tasks/generate-jsonata.md`
- [ ] 9.12 Migrate `designbook-css-daisyui/tasks/generate-jsonata.md`
- [ ] 9.13 Migrate `designbook-drupal/components/tasks/create-component.md`
- [ ] 9.14 Migrate `designbook/css-generate/tasks/generate-css.md`
- [ ] 9.15 Verify all remaining task files with `files: []` are unchanged (intake, preview, visual-diff tasks)

## 10. Integration Tests (New)

- [ ] 10.1 Test full pipeline: plan → write-file (stdin) → engine.writeFile called → validation result returned
- [ ] 10.2 Test direct engine: write-file → stash created → flush → mv to target + utime
- [ ] 10.3 Test git-worktree engine: write-file → written to WORKTREE path → flush is no-op
- [ ] 10.4 Test write-file with invalid content → written but `valid: false` with errors
- [ ] 10.5 Test write-file re-write → overwritten, re-validated
- [ ] 10.6 Test unknown key rejection, empty stdin rejection
- [ ] 10.7 Test structured file declaration parsing with template variables and env substitution
- [ ] 10.8 Test validator key lookup — known keys resolve, unknown keys rejected at plan time
- [ ] 10.9 Test workflow done gate-check: all green → done; missing validation_result → error; valid false → error

## 11. Update Skill Resources

- [ ] 11.1 Update `workflow-execution.md` skill resource — document write-file command, remove references to add-files/validate steps
- [ ] 11.2 Update `task-format.md` skill resource — document new structured `files:` format
