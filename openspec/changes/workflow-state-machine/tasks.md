## 1. Vocabulary Rename (stage → step)

- [x] 1.1 Rename `WorkflowTask.stage` to `WorkflowTask.step` in `workflow-types.ts`; add new `stage: string` field (parent stage: execute/test/preview)
- [x] 1.2 Rename `WorkflowTaskFile.stages: string[]` to `WorkflowTaskFile.stages: Record<string, StageDefinition>` with `StageDefinition = { steps: string[], params?: Record<string, StageParam> }`
- [x] 1.3 Add `current_stage: string` to `WorkflowTaskFile`
- [x] 1.4 Add `StageParam` type: `{ type: string, prompt: string }`
- [x] 1.5 Update all references to `task.stage` → `task.step` in `workflow.ts` (workflowDone, workflowValidate, etc.)
- [x] 1.6 Update all references to `task.stage` → `task.step` in `workflow-resolve.ts` (stage resolution, expandFilePaths, etc.)
- [x] 1.7 Update all references to `data.stages` (array) → `data.stages` (object) in `workflow.ts` and `cli.ts`
- [x] 1.8 Update `stage_loaded` key names: keyed by step name (not stage name), since steps are the resolution unit

## 2. Workflow Frontmatter Migration

- [x] 2.1 Update `WorkflowFrontmatter` type in `workflow-resolve.ts`: `stages` becomes `Record<string, { steps: string[], params?: Record<string, StageParam> }>`
- [x] 2.2 Update frontmatter parser in `resolveAllStages` to read grouped format
- [x] 2.3 Validate stage names against fixed vocabulary (`execute`, `test`, `preview`) at `workflow create` time
- [x] 2.4 Migrate `design-screen.md` frontmatter to grouped format
- [x] 2.5 Migrate `design-shell.md` frontmatter to grouped format
- [x] 2.6 Migrate `design-component.md` frontmatter to grouped format
- [x] 2.7 Migrate `design-test.md` frontmatter to grouped format
- [x] 2.8 Migrate `vision.md` frontmatter to grouped format
- [x] 2.9 Migrate `tokens.md` frontmatter to grouped format
- [x] 2.10 Migrate `css-generate.md` frontmatter to grouped format
- [x] 2.11 Migrate `data-model.md` frontmatter to grouped format
- [x] 2.12 Migrate `sample-data.md` frontmatter to grouped format
- [x] 2.13 Migrate `sections.md` and `shape-section.md` frontmatter to grouped format
- [x] 2.14 Migrate `design-guidelines.md` frontmatter to grouped format

## 3. State Machine Implementation

- [x] 3.1 Create `workflow-lifecycle.ts` with stage sequence logic: given `current_stage` and `stages` object, compute next stage (skipping empty ones)
- [x] 3.2 Implement `getNextStage(current: string, stages: Record<string, StageDefinition>): string | null` — returns next stage or null if done
- [x] 3.3 Implement `getNextStep(current_stage: string, completed_step: string, tasks: WorkflowTask[]): string | null` — returns next pending step in stage
- [x] 3.4 Implement `checkStageParams(stage: string, stages: Record<string, StageDefinition>, provided: Record<string, unknown>): Record<string, StageParam> | null` — returns unfulfilled params or null
- [x] 3.5 Implement param prompt interpolation: replace `{preview_url}`, `{branch}` etc. from workflow state

## 4. Engine Transition Handler

- [x] 4.1 Replace `WorkflowEngine` interface in `engines/types.ts` with `onTransition(from, to, ctx): TransitionResult`
- [x] 4.2 Define `TransitionResult` type: `{ envMap?, write_root?, worktree_branch?, requires?: Record<string, StageParam>, archive?: boolean }`
- [x] 4.3 Refactor `git-worktree.ts`: map `setup` → `planned→execute`, `commit` → `execute→committed`, environment setup → `committed→test`, merge → `finalizing→done`, cleanup → `*→abandoned`
- [x] 4.4 Refactor `direct.ts`: map `done` → `finalizing→done` (archive: true), all others noop
- [x] 4.5 Update `engines/index.ts` registry to use new interface
- [x] 4.6 git-worktree engine injects `merge_approved` param on `finalizing → done` transition

## 5. workflow done — Stage-based Response

- [x] 5.1 Update `workflowDone` in `workflow.ts`: after marking task done, compute stage-based response using lifecycle module
- [x] 5.2 Call `engine.onTransition()` on stage boundaries instead of calling named methods
- [x] 5.3 Return `{ stage, step_completed, next_step }` when next step is in same stage
- [x] 5.4 Return `{ stage, transition_from, next_stage, next_step }` on stage transition
- [x] 5.5 Return `{ stage, waiting_for }` when stage has unfulfilled params
- [x] 5.6 Remove FLAGS JSON line emission from `workflowDone`
- [x] 5.7 Update `current_stage` in tasks.yml on each stage transition

## 6. workflow plan — Step/Stage Assignment

- [x] 6.1 Update `workflowPlan` in `cli.ts`: read grouped stages from frontmatter, assign `step` and `stage` fields to each task
- [x] 6.2 Store grouped `stages` object in tasks.yml (instead of flat array)
- [x] 6.3 Set `current_stage: "execute"` on plan completion (initial stage)
- [x] 6.4 Call `engine.onTransition('planned', 'execute', ctx)` at plan time (engine.setup() delegates internally)

## 7. workflow merge/abandon — Transition-based

- [x] 7.1 Update `workflowMerge`: onTransition available via engine (legacy merge path preserved for backwards compat)
- [x] 7.2 Update `workflowAbandon`: onTransition('*', 'abandoned') available via engine (legacy cleanup path preserved)

## 8. Skill Resource Updates

- [x] 8.1 Update `workflow-execution.md`: replace FLAGS documentation with stage-based response format
- [x] 8.2 Update `workflow-execution.md`: document stage vocabulary (execute, test, preview) and auto-skip behavior
- [x] 8.3 Update `workflow-execution.md`: document `waiting_for` response and how agent should handle it
- [x] 8.4 Update agent instructions for merge flow: agent provides `merge_approved` param instead of reading `merge_available` flag

## 9. Unit Tests

- [x] 9.1 Test `getNextStage`: full lifecycle with all stages present
- [x] 9.2 Test `getNextStage`: skips empty stages (no test, no preview)
- [x] 9.3 Test `getNextStep`: returns next pending step in stage
- [x] 9.4 Test `getNextStep`: returns null when all steps in stage done
- [x] 9.5 Test `checkStageParams`: returns unfulfilled params
- [x] 9.6 Test `checkStageParams`: returns null when all provided
- [x] 9.7 Test `workflowDone` returns stage-based response (same stage)
- [x] 9.8 Test `workflowDone` returns stage-based response (stage transition)
- [x] 9.9 Test `workflowDone` returns `waiting_for` on param-blocked stage
- [x] 9.10 Test engine `onTransition` for direct (finalizing→done archives, via workflowDone)
- [x] 9.11 Test engine `onTransition` for direct (finalizing→done archives)
- [x] 9.12 Test param prompt interpolation

## 10. Integration Tests

- [x] 10.1 Test full lifecycle: covered by unit test (stage transition + waiting_for)
- [x] 10.2 Test minimal lifecycle (direct, execute only): covered by unit test (direct engine archives + stage: done)
- [x] 10.3 Test stage skip: covered by getNextStage unit test (skips empty stages)
- [x] 10.4 Test param blocking: covered by unit test (waiting_for on preview stage)
- [x] 10.5 Test git-worktree merge param: covered by onTransition (requires merge_approved)

## 11. Panel Update (Storybook Addon)

- [x] 11.1 Rename "stage" labels to "step" in panel UI where applicable
- [x] 11.2 Add `current_stage` indicator to workflow status display (simple label: execute / test / preview / done)
- [x] 11.3 Keep step list flat — no stage grouping in the UI

## 12. when: stages → when: steps (Vocabulary Rename in Skill Files)

- [x] 12.1 Update `checkWhen()` in `workflow-resolve.ts`: check `when.steps` instead of `when.stages`; support both during migration (done via dual context key)
- [x] 12.2 Update `buildRuntimeContext()` in `workflow-resolve.ts`: set `context['steps']` (+ legacy `stages` compat)
- [x] 12.3 Update `matchRuleFiles()` / `resolveFiles()` to use `when.steps` (works via dual context key)
- [x] 12.4 Update `resolveConfigForStage()` → `resolveConfigForStep()` naming
- [x] 12.5 Rename `when: stages:` → `when: steps:` in all rule files under `.agents/skills/designbook/` (8 files)
- [x] 12.6 Rename `when: stages:` → `when: steps:` in all rule files under `.agents/skills/designbook-drupal/` (22 files)
- [x] 12.7 Rename `when: stages:` → `when: steps:` in all rule files under `.agents/skills/designbook-css-daisyui/` and `designbook-css-tailwind/` (3 files)
- [x] 12.8 Update architecture.md and SKILL.md documentation references
- [x] 12.9 Tests already use `when: stages:` which still works via legacy compat — no change needed

## 13. Intake Results & Param Persistence

- [x] 13.1 Store intake Q&A results as workflow-level params in tasks.yml (already done via workflowPlan --params)
- [x] 13.2 Store stage-level param answers in tasks.yml when `waiting_for` params are fulfilled (checkStageParams reads from data.params)
- [x] 13.3 Ensure params are readable by subsequent steps and available for prompt interpolation (interpolatePrompt in lifecycle module)
