## 1. Add `when.steps` to all task files

- [x] 1.1 Workflow-qualified `--` tasks get `workflow:step` format: `intake--design-shell.md` → `when: steps: [design-shell:intake]`, `create-scene--design-shell.md` → `when: steps: [design-shell:create-scene]`, `plan-components--design-screen.md` → `when: steps: [design-screen:plan-components]`, etc. Update the corresponding workflow definitions to use the qualified step name where they still use the unqualified form (e.g. `steps: [intake]` → `steps: [design-shell:intake]`)
- [x] 1.2 Add `steps: [create-component]` to `designbook-drupal/components/tasks/create-component.md` (already has `when: frameworks.component: sdc` — add `steps` to existing `when` block)
- [x] 1.3 Add `when: steps: [<step>]` to all remaining generic task files: `create-data-model`, `create-tokens`, `create-guidelines`, `create-vision`, `create-section`, `create-sample-data`, `generate-css`, `generate-index`, `generate-jsonata`, `run-workflow`, `storybook-preview`, `screenshot`, `resolve-reference`, `visual-compare`, `polish`
- [x] 1.4 Add `steps` to tasks with existing `when` but no `steps`: `prepare-fonts.md` (`when: extensions: google-fonts` → add `steps`). Verify step name matches the workflow stage.

## 2. Update CLI resolver

- [x] 2.1 Change `resolveTaskFiles()` to use broad scan (`skills/**/tasks/*.md`) as primary mechanism with `buildRuntimeContext(stage)` — remove filename-based glob as primary path
- [x] 2.2 Change `resolveTaskFilesRich()` to match — same broad scan mechanism
- [x] 2.3 Keep filename-based resolution as fallback with deprecation warning for task files without `when.steps`
- [x] 2.4 Remove the pragmatic broad-scan fallback added in `pipeline-fixes` (the secondary `when.steps`-only scan)

## 3. Update tests

- [x] 3.1 Add test: broad-scan resolution finds task by `when.steps` regardless of filename
- [x] 3.2 Add test: task without `when.steps` emits warning and falls back to filename match
- [x] 3.3 Add test: multiple tasks from different skills match one step via `when.steps`
- [x] 3.4 Update existing tests that rely on filename-only matching to include `when.steps` in test fixtures

## 4. Verification

- [x] 4.1 Run `pnpm check` from repo root
- [x] 4.2 Rebuild workspace (`./scripts/setup-workspace.sh drupal-stitch`) and verify `workflow create` for design-shell resolves all steps correctly
