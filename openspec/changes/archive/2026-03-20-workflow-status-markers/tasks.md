# Implementation Tasks

## 1. TypeScript: Add status field to WorkflowFile

- [x] 1.1 Add `status?: 'planning' | 'running' | 'completed'` to `WorkflowTaskFile` interface in `workflow-types.ts`
- [x] 1.2 Add `status?: 'planning' | 'running' | 'completed'` to `WorkflowFile` interface in `workflow.ts`
- [x] 1.3 Update `Panel.tsx` `WorkflowData` interface to include `status` field

## 2. TypeScript: Implement status transitions in CLI

- [x] 2.1 Update `workflowCreate()` to set `status: 'planning'` in the written YAML
- [x] 2.2 Update `workflowUpdate()` to auto-transition from `planning` to `running` when first files are registered
- [x] 2.3 Add validation: `workflowUpdate --status done` only succeeds if ALL tasks are done (currently partial)
- [x] 2.4 Update `workflowUpdate()` to auto-set `status: 'completed'` when all tasks done
- [x] 2.5 Verify file writes are atomic (temp file + rename)

## 3. TypeScript: Panel display updates

- [x] 3.1 Update `WorkflowsTab` in `Panel.tsx` to render status icons: 📋 (planning), ⚡ (running), ✅ (completed)
- [x] 3.2 Add optional styling for planning workflows (e.g., reduced opacity)
- [x] 3.3 Ensure Panel reads `status` from `WorkflowData` and uses it for icon selection

## 4. Skill: designbook-workflow

- [x] 4.1 Add `## AI Rules` section to `designbook-workflow/SKILL.md` covering:
  - [x] 4.1a Rule 1: Workflow start (read frontmatter, create workflow with planning)
  - [x] 4.1b Rule 2: File registration (auto-transition to running on first files)
  - [x] 4.1c Rule 3: Validation gate (mandatory validation loop until exit 0)
  - [x] 4.1d Rule 4: Workflow done (auto-archive when all tasks done)
  - [x] 4.1e Rule 5: $WORKFLOW_NAME scope (skip if not set)
- [x] 4.2 Update `designbook-workflow/steps/create.md` to document new planning status
- [x] 4.3 Update `designbook-workflow/steps/update.md` to document status transitions

## 5. Workflow refactoring: YAML frontmatter + markers

- [x] 5.1 Update `debo-vision.md`: add frontmatter with tasks, add `!WORKFLOW_FILE`, remove Workflow Tracking section
- [x] 5.2 Update `debo-sections.md`: add frontmatter with tasks, add `!WORKFLOW_FILE`, remove Workflow Tracking section
- [x] 5.3 Update `debo-shape-section.md`: add frontmatter with tasks, add `!WORKFLOW_FILE`, fix id to `debo-shape-section`, remove Workflow Tracking
- [x] 5.4 Update `debo-data-model.md`: add frontmatter, add `!WORKFLOW_FILE`, remove Workflow Tracking section
- [x] 5.5 Update `debo-sample-data.md`: add frontmatter, add `!WORKFLOW_FILE`, remove Workflow Tracking section
- [x] 5.6 Update `debo-design-tokens.md`: add frontmatter, add `!WORKFLOW_FILE`, remove Workflow Tracking section
- [x] 5.7 Update `debo-css-generate.md`: add frontmatter, add `!WORKFLOW_FILE`, remove Workflow Tracking section
- [x] 5.8 Update `debo-design-shell.md`: add frontmatter with 3 tasks, add `!WORKFLOW_FILE` per task, remove Workflow Tracking section
- [x] 5.9 Update `debo-design-component.md`: add frontmatter with 3 tasks, add `!WORKFLOW_FILE` per task, remove Workflow Tracking section
- [x] 5.10 Update `debo-design-screen.md`: add frontmatter with 3 tasks, add `!WORKFLOW_FILE` per task, remove Workflow Tracking section
- [x] 5.11 Update `debo-export-product.md`: add frontmatter with tasks, add `!WORKFLOW_FILE`, fix id, remove Workflow Tracking section (N/A — file deleted)
- [x] 5.12 Update `debo-screenshot-design.md`: add frontmatter, add `!WORKFLOW_FILE`, fix id, remove Workflow Tracking section
- [x] 5.13 Update `debo-run-promptfoo-test.md`: add frontmatter, add workflow tracking integration

## 6. Skills: Add markers for consistency

- [x] 6.1 Add `!WORKFLOW_FILE` markers to `designbook-tokens/SKILL.md`
- [x] 6.2 Add `!WORKFLOW_FILE` markers to `designbook-data-model/SKILL.md`
- [x] 6.3 Add `!WORKFLOW_FILE` markers to `designbook-sample-data/SKILL.md`
- [x] 6.4 Add `!WORKFLOW_FILE` markers to `designbook-components-sdc/SKILL.md`
- [x] 6.5 Add `!WORKFLOW_FILE` markers to `designbook-scenes/SKILL.md`
- [x] 6.6 Add `!WORKFLOW_FILE` markers to `designbook-view-modes/SKILL.md`
- [x] 6.7 Add `!WORKFLOW_FILE` markers to other file-producing skills as needed (figma-components-sdc, figma-stories-sdc)

## 7. Build + Linting

- [x] 7.1 Build addon: `cd packages/storybook-addon-designbook && npx tsc`
- [x] 7.2 Run eslint: `cd packages/storybook-addon-designbook && npx eslint --cache --fix .`
- [x] 7.3 Run root lint: `npm run lint`

## 8. Verification

- [x] 8.1 Create a test workflow with `designbook-workflow create` and verify `tasks.yml` has `status: planning`
- [x] 8.2 Run `workflow update` with `--files` and verify status auto-transitions to `running`
- [x] 8.3 Run `workflow update` with `--status done` for all tasks and verify auto-transitions to `completed` + archive
- [x] 8.4 Verify validation gate: try `--status done` without passing validation, verify error
- [ ] 8.5 Open Storybook, verify Panel shows 📋 / ⚡ / ✅ icons for workflows in each status
- [x] 8.6 Test backwards compatibility: old workflows without status field still work (`status?` is optional in interfaces)
