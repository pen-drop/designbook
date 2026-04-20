## 1. CLI — $ref Resolution in Workflow Expansion

- [x] 1.1 In `expandResultDeclarations` (workflow-resolve.ts ~line 921), stop stripping `$ref` from result declarations — preserve it on the declaration object
- [x] 1.2 In `expandWorkflowTasks` (cli/workflow.ts ~line 128), after `expandTasksFromParams` returns, call `collectAndResolveSchemas(tasks, skillsRoot)` to resolve all `$ref` entries and populate `task.result[key].schema`
- [x] 1.3 Pass the returned schemas map to `workflowPlan` instead of `undefined`
- [x] 1.4 Add error handling: when `$ref` resolution fails (file not found, missing key), produce an error with the `$ref` value, resolved path, and task ID
- [x] 1.5 Add unit test: task with `$ref` result schema validates correctly via `workflow done --data`
- [x] 1.6 Add unit test: `$ref` to non-existent file produces actionable error message

## 2. Schema — Extend Issue Type

- [x] 2.1 In `.agents/skills/designbook/design/tasks/schemas.yml`, add optional properties `id` (string), `storyId` (string), `checkKey` (string), `scene` (string) to the `Issue` schema
- [x] 2.2 In `triage.md`, add `$ref: ../schemas.yml#/Issue` to `params.issues` declaration

## 3. Skill Files — Reclassify Mistyped Files

- [x] 3.1 Move `.agents/skills/designbook/design/rules/extract-reference.md` to `.agents/skills/designbook/design/resources/extract-reference.md` — remove `when:` frontmatter
- [x] 3.2 Move `.agents/skills/designbook/design/blueprints/static-assets.md` to `.agents/skills/designbook/design/resources/static-assets.md` — remove `when:` frontmatter
- [x] 3.3 In `static-assets.md`, replace incorrect `npx playwright-cli` commands with correct `npx playwright` syntax
- [x] 3.4 Update any task files that explicitly reference these files by path (check `reads:` entries across all task files)

## 4. Step Names — Fix Stale and Bare References

- [x] 4.1 In `.agents/skills/designbook-drupal/scenes/rules/scenes-constraints.md`, replace `create-scene` with `design-shell:create-scene, design-screen:create-scene` in `when.steps`
- [x] 4.2 In `.agents/skills/designbook-css-tailwind/rules/scenes-constraints.md`, replace `create-scene` with `design-shell:create-scene, design-screen:create-scene` in `when.steps`
- [x] 4.3 In `.agents/skills/designbook/vision/rules/vision-context.md`, remove `recapture` from `when.steps`
- [x] 4.4 In `.agents/skills/designbook/design/rules/playwright-capture.md`, remove `recapture` from `when.steps`
- [x] 4.5 In `.agents/skills/designbook-drupal/scenes/rules/scenes-constraints.md`, add `backend: drupal` to `when:` guard

## 5. Blueprints — Deduplicate Rule Content

- [x] 5.1 In `.agents/skills/designbook-drupal/components/blueprints/section.md`, replace inline `{% block %}` constraint with single-sentence reference to `sdc-conventions.md`
- [x] 5.2 In `.agents/skills/designbook-drupal/components/blueprints/grid.md`, same deduplication
- [x] 5.3 In `.agents/skills/designbook-drupal/components/blueprints/container.md`, same deduplication

## 6. Task Content — Fix Stale References

- [x] 6.1 In `.agents/skills/designbook/design/tasks/polish.md`, remove the `design_hint` reference (unreachable via issues pipeline, copy-paste error from create-component.md)

## 7. Verification

- [x] 7.1 Run `pnpm check` in repo root to verify CLI TypeScript compiles and tests pass
- [x] 7.2 From repo root, run `./scripts/setup-workspace.sh drupal-web` to rebuild test workspace with updated skill symlinks
- [x] 7.3 In workspace, run `_debo workflow create --workflow design-shell` and verify `stage_loaded` contains corrected rule/blueprint paths (no extract-reference in rules, no static-assets in blueprints, scenes-constraints loaded correctly)
- [x] 7.4 Verify `workflow done --data` with `$ref`-based result schemas works without manual inlining
