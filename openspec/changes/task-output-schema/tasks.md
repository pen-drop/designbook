## 1. Schema Infrastructure (Part 2)

- [x] 1.1 Add `loadSchemaFile(path)` utility — parses `schemas.yml` YAML into a JSON Schema map, validates PascalCase keys and draft-07 structure
- [x] 1.2 Add `$ref` resolver — resolves relative paths (from task file) and skill-qualified paths (from skills root), returns inlined schema definitions
- [x] 1.3 Integrate schema resolution into `resolveAllStages()` — resolve all `$ref` entries at `workflow create` time, store resolved schemas in tasks.yml under top-level `schemas:` field
- [x] 1.4 Fail-fast on unresolvable `$ref` — `workflow create` errors with the unresolved reference path

## 2. Result Declaration (Part 2)

- [x] 2.1 Extend `parseFrontmatter()` to extract `result:` and `each:` from task files
- [x] 2.2 Rename/extend `expandFileDeclarations()` to `expandResultDeclarations()` — handle both file results (with `path:`) and data results (without `path:`)
- [x] 2.3 Update `WorkflowTask` type — replace `files` with `result` map (`{ path?, valid?, value?, validators? }` per key)
- [x] 2.4 Add `files:` → `result:` fallback in frontmatter parser — convert legacy `files:` entries to `result:` format with deprecation warning
- [x] 2.5 Update `workflowDone()` file gate — check `task.result` entries instead of `task.files`

## 3. Workflow Result Command (Part 2)

- [x] 3.1 Implement `workflowResult()` function in `src/workflow.ts` — file results (stdin → disk via engine) and data results (`--json` → inline in tasks.yml)
- [x] 3.2 Add JSON Schema validation step using ajv — validate content against resolved schema from `tasks.yml` `schemas:` field before accepting result
- [x] 3.3 Integrate semantic validators — run `validateByKeys()` after JSON Schema passes, aggregate errors from both steps
- [x] 3.4 Register `workflow result` CLI command in `src/cli/workflow.ts` — `--workflow`, `--task`, `--key`, optional `--json`, stdin for file content
- [x] 3.5 Convert `workflow write-file` to deprecated alias — delegate to `workflow result` internally

## 4. Scope and Stage Completion (Part 2)

- [x] 4.1 Add `scope: Record<string, unknown>` to `WorkflowFile` type — defaults to `{}`, persisted in tasks.yml
- [x] 4.2 Implement stage completion detection in `workflowDone()` — after marking task done, check if all tasks in `task.stage` are done
- [x] 4.3 Implement result collection at stage completion — collect data results from all done tasks in the stage, concatenate arrays for `each:`-stages
- [x] 4.4 Write collected results to scope — update `data.scope` and persist atomically
- [x] 4.5 Implement scope-driven stage expansion — evaluate all pending stages after scope update, expand stages whose `each:` key and `params:` are satisfied
- [x] 4.6 Refactor `expandTasksFromParams()` to read from `data.scope` instead of `data.params` for `each:` arrays and param resolution

## 5. Task-Level `each:` (Part 2)

- [x] 5.1 Read `each:` from task frontmatter in `expandTasksFromParams()` — use task-level `each: { <key>: { $ref } }` instead of stage-level `each:`
- [x] 5.2 Fallback to stage-level `each:` when task has no `each:` — emit deprecation warning via `console.warn`
- [x] 5.3 Validate `each:` items against resolved schema before creating task instances (by design: validation occurs at `workflow result` time via ajv, before data enters scope)

## 6. Response JSON Extension (Part 2)

- [x] 6.1 Extend `StageResponse` interface with `stage_progress`, `stage_complete`, `scope_update`, `expanded_tasks` fields
- [x] 6.2 Return `stage_progress: "N/M"` and `stage_complete: false` for mid-stage task completions
- [x] 6.3 Return `stage_complete: true`, `scope_update`, `next_stage`, `expanded_tasks` when last task in stage completes
- [x] 6.4 Remove `--params` expansion from `workflow done` CLI action — deprecate with warning, data passing handled by `workflow result`

## 7. Storybook Panel (Part 2)

- [x] 7.1 Update Files tab to read from `task.result` entries instead of `task.files` — show both file results (with path) and data results (inline)

## 8. Schema Files (Part 1)

- [x] 8.1 Create `designbook/design/schemas.yml` — define `Check`, `Issue`, `Component`, `ComponentYml`, `Scene`, `Reference` types
- [x] 8.2 Create `designbook/vision/schemas.yml` — define `Vision` type
- [x] 8.3 Create `designbook/data-model/schemas.yml` — define `DataModel` type
- [x] 8.4 Create `designbook/tokens/schemas.yml` — define `DesignTokens` type
- [x] 8.5 Create `designbook/css-generate/schemas.yml` — define `CssGroup`, `GoogleFontsCss`, `IndexCss`, `Jsonata` types
- [x] 8.6 Create `designbook/sections/schemas.yml` — define `Section`, `SectionScenes` types
- [x] 8.7 Create `designbook/sample-data/schemas.yml` — define `SampleData` type
- [x] 8.8 Create `designbook/import/schemas.yml` — define `ImportWorkflow` type

## 9. Task File Migration — Design Verification (Part 1)

- [x] 9.1 Migrate `design/tasks/setup-compare.md` — replace `--params` with `result: { checks: ... }`
- [x] 9.2 Migrate `design/tasks/compare-screenshots.md` — add `each: { checks: { $ref } }`, replace draft JSON file writes with `result: { issues: ... }`
- [x] 9.3 Migrate `design/tasks/triage.md` — remove glob-based draft reading, declare `params: { issues: ... }` resolved from scope
- [x] 9.4 Migrate `design/tasks/polish.md` — add `each: { issues: { $ref } }`
- [x] 9.5 Migrate `design/tasks/verify.md` — update `files:` to `result:`
- [x] 9.6 Migrate `design/tasks/outtake--design.md` — remove glob-based draft issue reading, use scope for issue data
- [x] 9.7 Migrate `design/tasks/outtake--design-verify.md` — update `files: []` to remove legacy field

## 10. Task File Migration — Design Intake & Scenes (Part 1)

- [x] 10.1 Migrate `design/tasks/intake--design-shell.md` — replace `workflow done --params` with `workflow result` for `component` and `scene` arrays
- [x] 10.2 Migrate `design/tasks/intake--design-screen.md` — replace `workflow done --params` with `workflow result` for `component` array
- [x] 10.3 Migrate `design/tasks/intake--design-verify.md` — update `files: []` to remove legacy field
- [x] 10.4 Migrate `design/tasks/intake--design-component.md` — update `files: []` to remove legacy field
- [x] 10.5 Migrate `design/tasks/create-scene--design-shell.md` — replace `files:` with `result:` (file result with `path:`)
- [x] 10.6 Migrate `design/tasks/create-scene--design-screen.md` — replace `files:` with `result:` (file result with `path:`)

## 11. Task File Migration — Design Components & Capture (Part 1)

- [x] 11.1 Migrate `design/tasks/configure-meta.md` — replace `files:` with `result:`, add `each:` for story iteration
- [x] 11.2 Migrate `design/tasks/capture-reference.md` — replace `files:` with `result:` (screenshot file result)
- [x] 11.3 Migrate `design/tasks/capture-storybook.md` — replace `files:` with `result:` (screenshot file result)
- [x] 11.4 Migrate `design/tasks/map-entity--design-screen.md` — replace `files:` with `result:` (entity-mapping file result)

## 12. Task File Migration — Non-Design Concerns (Part 1)

- [x] 12.1 Migrate `vision/tasks/create-vision.md` — replace `files:` with `result:`, update `write-file` to `workflow result`
- [x] 12.2 Migrate `data-model/tasks/create-data-model.md` — replace `files:` with `result:`, update `write-file` to `workflow result`
- [x] 12.3 Migrate `data-model/tasks/intake--data-model.md` — update `files: []` to remove legacy field
- [x] 12.4 Migrate `tokens/tasks/create-tokens.md` — replace `files:` with `result:`, update `write-file` to `workflow result`
- [x] 12.5 Migrate `tokens/tasks/intake--tokens.md` — update `files: []` to remove legacy field
- [x] 12.6 Migrate `sections/tasks/create-section.md` — replace `files:` with `result:`, update `write-file` to `workflow result`
- [x] 12.7 Migrate `sample-data/tasks/create-sample-data.md` — replace `files:` with `result:`, update `write-file` to `workflow result`
- [x] 12.8 Migrate `sample-data/tasks/intake--sample-data.md` — update `files: []` to remove legacy field
- [x] 12.9 Migrate `css-generate/tasks/generate-index.md` — replace `files:` with `result:`, update `write-file` to `workflow result`
- [x] 12.10 Migrate `css-generate/tasks/generate-jsonata.md` — replace `files:` with `result:` (has validators)
- [x] 12.11 Migrate `css-generate/fonts/google/tasks/prepare-fonts.md` — replace `files:` with `result:`
- [x] 12.12 Migrate `css-generate/tasks/intake--css-generate.md` — update `files: []` to remove legacy field
- [x] 12.13 Migrate `import/tasks/intake--import.md` — update `files: []` to remove legacy field
- [x] 12.14 Migrate `import/tasks/run-workflow.md` — update `files: []` to remove legacy field

## 13. Workflow Definition Migration (Part 1)

- [x] 13.1 Remove stage-level `each:` from `design/workflows/design-shell.md` — stages: component, capture, compare, polish
- [x] 13.2 Remove stage-level `each:` from `design/workflows/design-verify.md` — stages: capture, compare, polish
- [x] 13.3 Remove stage-level `each:` from `design/workflows/design-screen.md` — stages: component, scene, capture, compare
- [x] 13.4 Remove stage-level `each:` from `design/workflows/design-component.md` — stages: component, test
- [x] 13.5 Remove stage-level `each:` from `sections/workflows/sections.md` — stage: execute
- [x] 13.6 Remove stage-level `each:` from `import/workflows/import.md` — stage: execute
- [x] 13.7 Remove stage-level `each:` from `css-generate/workflows/css-generate.md` — stage: generate

## 14. Rules Migration (Part 1)

- [x] 14.1 Update `design/rules/playwright-capture.md` — replace `workflow write-file` with `workflow result`
- [x] 14.2 Update `design/rules/extract-reference.md` — replace `workflow write-file` with `workflow result`

## 15. Skill Instructions & Documentation (Part 1)

- [x] 15.1 Update `resources/workflow-execution.md` — document `workflow result`, scope model, stage completion, `workflow done` without `--params`
- [x] 15.2 Update `resources/task-format.md` — document `result:`, `each:` on tasks, `$ref` syntax, `schemas.yml` file format
- [x] 15.3 Update `resources/cli-workflow.md` — replace `write-file` examples with `workflow result`, remove `--params` from `done`
- [x] 15.4 Update `resources/architecture.md` — update `each:` examples from stage-level to task-level

## 16. Integration Skills (Part 3)

- [x] 16.1 Migrate `designbook-drupal/components/tasks/create-component.md` — replace `files:` with `result:` (component-yml, component-twig, component-story, app-css), update `write-file` calls to `workflow result`
- [x] 16.2 Add cross-skill `$ref` references where drupal schemas reference core `designbook/design/schemas.yml#/Component`

## 17. Params Validation in CLI (Part 4)

- [ ] 17.1 Add old-format params detection to `parseFrontmatter()` — detect null (`~`), bare arrays (`[]`), bare objects without `type` (`{}`), and scalar values as param values
- [ ] 17.2 Fail `workflow create` with descriptive error when old-format params detected — error must name the offending param key and task file path
- [ ] 17.3 Add unit tests for old-format detection — test null, `[]`, `{}`, string, number, boolean as param values → all rejected; `{ type: string }`, `{ type: array, default: [] }`, `{ type: object, properties: ... }` → all accepted

## 18. Task File Params Migration — Vision, Data-Model, Tokens (Part 4)

- [ ] 18.1 Migrate `vision/tasks/create-vision.md` — `product_name: ~` → `{ type: string }`, `description: ~` → `{ type: string }`, `problems: []` → `{ type: array, default: [], items: ... }`, `features: []` → `{ type: array, default: [], items: { type: string } }`, `design_reference: ~` → `{ type: object, default: null, properties: ... }`, `references: []` → `{ type: array, default: [], items: ... }`
- [ ] 18.2 Migrate `data-model/tasks/create-data-model.md` — `content: {}` → `{ type: object }`
- [ ] 18.3 Migrate `tokens/tasks/create-tokens.md` — `intake: {}` → `{ type: object }`

## 19. Task File Params Migration — Design Concern (Part 4)

- [ ] 19.1 Migrate `design/tasks/setup-compare.md` — `scene: ~` → `{ type: string }`, `reference: []` → `{ type: array, default: [] }`, `breakpoints: []` → `{ type: array, default: [] }`
- [ ] 19.2 Migrate `design/tasks/compare-screenshots.md` — `scene: ~, storyId: ~, breakpoint: ~, region: ~` → all `{ type: string }`
- [ ] 19.3 Migrate `design/tasks/capture-storybook.md` — `scene: ~, storyId: ~, breakpoint: ~, region: ~` → all `{ type: string }`
- [ ] 19.4 Migrate `design/tasks/verify.md` — `scene: ~, storyId: ~, breakpoint: ~, region: ~` → all `{ type: string }`
- [ ] 19.5 Migrate `design/tasks/triage.md` — `scene: ~, storyId: ~` → `{ type: string }` (keep `issues: { type: array }` as-is, already valid)
- [ ] 19.6 Migrate `design/tasks/polish.md` — `id: ~, scene: ~, storyId: ~, checkKey: ~, severity: ~, description: ~, file_hint: ~` → all `{ type: string }`, `properties: []` → `{ type: array, default: [] }`
- [ ] 19.7 Migrate `design/tasks/outtake--design.md` — `scene: ~, storyId: ~` → `{ type: string }`, `reference: []` → `{ type: array, default: [] }` (keep `issues: { type: array }` as-is)
- [ ] 19.8 Migrate `design/tasks/outtake--design-verify.md` — `scene: ~, storyId: ~` → `{ type: string }`
- [ ] 19.9 Migrate `design/tasks/configure-meta.md` — `storyId: ~` → `{ type: string }`
- [ ] 19.10 Migrate `design/tasks/create-scene--design-screen.md` — `section_id: ~, section_title: ~, section_description: ~` → `{ type: string }`, `scenes: [], reference: []` → `{ type: array, default: [] }`
- [ ] 19.11 Migrate `design/tasks/create-scene--design-shell.md` — `reference: []` → `{ type: array, default: [] }`
- [ ] 19.12 Migrate `design/tasks/map-entity--design-screen.md` — `entity_type: ~, bundle: ~, view_mode: ~` → all `{ type: string }`
- [ ] 19.13 Migrate `design/tasks/intake--design-verify.md` — `scene: ~` → `{ type: string }`, `reference: [], breakpoints: []` → `{ type: array, default: [] }`

## 20. Task File Params Migration — Other Concerns (Part 4)

- [ ] 20.1 Migrate `css-generate/tasks/generate-jsonata.md` — `group: ~` → `{ type: string }`
- [ ] 20.2 Migrate `sections/tasks/create-section.md` — `section_id: ~, section_title: ~, description: ~` → `{ type: string }`, `order: ~` → `{ type: integer }`
- [ ] 20.3 Migrate `sample-data/tasks/create-sample-data.md` — `section_id: ~` → `{ type: string }`, `entities: []` → `{ type: array, default: [] }`
- [ ] 20.4 Migrate `import/tasks/run-workflow.md` — `workflow: ~` → `{ type: string }`, `params: {}` → `{ type: object, default: {} }`

## 21. Task File Params Migration — Integration Skills (Part 4)

- [ ] 21.1 Migrate `designbook-drupal/components/tasks/create-component.md` — `component: ~, group: ~` → `{ type: string }`, `slots: [], props: [], variants: []` → `{ type: array, default: [] }`

## 22. Verification (Part 4)

- [ ] 22.1 Run `pnpm check` — typecheck, lint, test pass
- [ ] 22.2 Run `./scripts/setup-workspace.sh drupal-schema`, then run vision workflow — verify `workflow create` accepts new params format
- [ ] 22.3 Verify old-format params are rejected — temporarily revert one task file, confirm `workflow create` fails with descriptive error
