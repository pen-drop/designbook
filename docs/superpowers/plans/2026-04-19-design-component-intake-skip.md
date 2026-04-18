# Design-Component Intake Skip + components[] Naming Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename intake result `component[]` → `components[]` (restoring outer-plural/inner-singular `each:` convention), then add a `components` workflow param to `design-component` that skips the intake stage when callers already have the full Component spec.

**Architecture:** Two ordered workstreams. Step A is a pure naming refactor across three intake task files plus two `each:` declarations — no engine changes. Step B adds a `components` workflow param to `design-component.md`; the CLI `workflow create` handler detects it and injects `data.scope.components` while emitting zero intake tasks. The existing "stage with no tasks → keep walking" path in `workflow.ts` then transitions straight to the `component` stage, which expands from the seeded scope.

**Tech Stack:** TypeScript, vitest, `packages/storybook-addon-designbook/src/{workflow,cli/workflow}.ts` + `.agents/skills/designbook/` + `.agents/skills/designbook-drupal/`

**Spec:** `docs/superpowers/specs/2026-04-19-design-component-intake-skip-design.md`

---

## File Structure

| File | Responsibility |
|---|---|
| `.agents/skills/designbook/design/tasks/intake--design-component.md` (MODIFY) | Result key `component` → `components`; Step 5 wording. |
| `.agents/skills/designbook/design/tasks/intake--design-shell.md` (MODIFY) | Result key `component` → `components`. |
| `.agents/skills/designbook/design/tasks/intake--design-screen.md` (MODIFY) | Result key `component` → `components`. |
| `.agents/skills/designbook-drupal/components/tasks/create-component.md` (MODIFY) | `each.component.expr: "component"` → `expr: "components"`. |
| `.agents/skills/designbook-drupal/components/tasks/create-variant-story.md` (MODIFY) | `each.component.expr: "component"` → `expr: "components"`. Inner `expr: "component.variants"` unchanged (now reads the unambiguous inner binding). |
| `.agents/skills/designbook-skill-creator/resources/schemas.md` (MODIFY) | Update two `expr: "component"` doc examples to `expr: "components"`. |
| `.agents/skills/designbook/resources/architecture.md` (MODIFY) | Update any `expr: "component"` references. |
| `.agents/skills/designbook/design/workflows/design-component.md` (MODIFY) | Add `components` workflow param. |
| `packages/storybook-addon-designbook/src/workflow.ts` (MODIFY) | `workflowCreate` accepts new optional `initialScope` param and seeds `data.scope`. |
| `packages/storybook-addon-designbook/src/cli/workflow.ts` (MODIFY) | When workflow is `design-component` and `initialParams.components` is non-empty, set `firstTask = []` and pass `initialScope = { components }` to `workflowCreate`. |
| `packages/storybook-addon-designbook/src/cli/__tests__/workflow-skip-intake.test.ts` (NEW) | Integration test: `workflow create design-component --params components='[{...}]'` produces zero intake tasks; subsequent stage transition expands `component` stage from seeded scope. |
| `fixtures/drupal-petshop/cases/design-component-skip-intake.yaml` (NEW) | E2E fixture: avatar component definition pre-supplied via `components` param. |

---

## Task 1: Rename intake result keys (Step A)

**Files:**
- Modify: `.agents/skills/designbook/design/tasks/intake--design-component.md`
- Modify: `.agents/skills/designbook/design/tasks/intake--design-shell.md`
- Modify: `.agents/skills/designbook/design/tasks/intake--design-screen.md`

- [ ] **Step 1.1: Update intake--design-component.md frontmatter**

In `.agents/skills/designbook/design/tasks/intake--design-component.md`, replace:

```yaml
result:
  type: object
  required: [component]
  properties:
    component:
      type: array
      items:
        $ref: ../schemas.yml#/Component
```

with:

```yaml
result:
  type: object
  required: [components]
  properties:
    components:
      type: array
      items:
        $ref: ../schemas.yml#/Component
```

- [ ] **Step 1.2: Update intake--design-component.md Step 5 body**

In the same file, replace the body of "Step 5: Complete Intake":

```markdown
Store the `component` iterable as task result.

- **`component`**: one entry with `component` (name), `slots` (array), and `group` (set to component name as default group).
- When a design reference was extracted, also include `design_hint` (structured data from `$reference_dir/extract.json`) and `reference_screenshot` (absolute path to `$reference_dir/reference-full.png`) on the component item.
```

with:

```markdown
Store the `components` iterable as task result.

- **`components`**: one entry with `component` (name), `slots` (array), and `group` (set to component name as default group).
- When a design reference was extracted, also include `design_hint` (structured data from `$reference_dir/extract.json`) and `reference_screenshot` (absolute path to `$reference_dir/reference-full.png`) on the component item.
```

- [ ] **Step 1.3: Update intake--design-shell.md frontmatter**

In `.agents/skills/designbook/design/tasks/intake--design-shell.md`, replace:

```yaml
result:
  type: object
  required: [component]
  properties:
    component:
      type: array
      items:
        $ref: ../schemas.yml#/Component
    output_path:
      type: string
      default: $DESIGNBOOK_DATA/design-system/design-system.scenes.yml
```

with:

```yaml
result:
  type: object
  required: [components]
  properties:
    components:
      type: array
      items:
        $ref: ../schemas.yml#/Component
    output_path:
      type: string
      default: $DESIGNBOOK_DATA/design-system/design-system.scenes.yml
```

- [ ] **Step 1.4: Search intake--design-shell.md body for `component` iterable references**

Run: `grep -n "component" .agents/skills/designbook/design/tasks/intake--design-shell.md`

For any line that refers to the result iterable (e.g. "store the `component` iterable", "the `component` array"), update to `components`. Do NOT change references to the singular `Component` schema, the per-item `component:` field name, or the inner binding `component`.

- [ ] **Step 1.5: Update intake--design-screen.md frontmatter**

In `.agents/skills/designbook/design/tasks/intake--design-screen.md`, replace:

```yaml
result:
  type: object
  required: [component, output_path, entity_mappings, section_id, section_title]
  properties:
    component:
      type: array
      items:
        $ref: ../schemas.yml#/Component
```

with:

```yaml
result:
  type: object
  required: [components, output_path, entity_mappings, section_id, section_title]
  properties:
    components:
      type: array
      items:
        $ref: ../schemas.yml#/Component
```

- [ ] **Step 1.6: Search intake--design-screen.md body for iterable references**

Run: `grep -n "component" .agents/skills/designbook/design/tasks/intake--design-screen.md`

For any line that refers to the result iterable, update to `components`. Same exclusions as Step 1.4.

- [ ] **Step 1.7: Commit**

```bash
git add .agents/skills/designbook/design/tasks/intake--design-component.md \
        .agents/skills/designbook/design/tasks/intake--design-shell.md \
        .agents/skills/designbook/design/tasks/intake--design-screen.md
git commit -m "refactor(skill): rename intake result component[] -> components[]"
```

---

## Task 2: Update Drupal create-component each: declaration

**Files:**
- Modify: `.agents/skills/designbook-drupal/components/tasks/create-component.md`

- [ ] **Step 2.1: Update each: expression**

In `.agents/skills/designbook-drupal/components/tasks/create-component.md`, replace:

```yaml
each:
  component:
    expr: "component"
    schema: { $ref: designbook/design/schemas.yml#/Component }
```

with:

```yaml
each:
  component:
    expr: "components"
    schema: { $ref: designbook/design/schemas.yml#/Component }
```

- [ ] **Step 2.2: Commit**

```bash
git add .agents/skills/designbook-drupal/components/tasks/create-component.md
git commit -m "refactor(skill): create-component reads outer 'components' scope"
```

---

## Task 3: Update Drupal create-variant-story each: declaration

**Files:**
- Modify: `.agents/skills/designbook-drupal/components/tasks/create-variant-story.md`

- [ ] **Step 3.1: Update outer each: expression**

In `.agents/skills/designbook-drupal/components/tasks/create-variant-story.md`, replace:

```yaml
each:
  component:
    expr: "component"
    schema: { $ref: designbook/design/schemas.yml#/Component }
  variant:
    expr: "component.variants"
    schema: { $ref: designbook/design/schemas.yml#/Variant }
```

with:

```yaml
each:
  component:
    expr: "components"
    schema: { $ref: designbook/design/schemas.yml#/Component }
  variant:
    expr: "component.variants"
    schema: { $ref: designbook/design/schemas.yml#/Variant }
```

The inner `expr: "component.variants"` is intentionally unchanged: it now reads the unambiguous inner binding (the just-bound singular `component`), which is exactly what the engine produces.

- [ ] **Step 3.2: Commit**

```bash
git add .agents/skills/designbook-drupal/components/tasks/create-variant-story.md
git commit -m "refactor(skill): create-variant-story reads outer 'components' scope"
```

---

## Task 4: Update skill-creator documentation examples

**Files:**
- Modify: `.agents/skills/designbook-skill-creator/resources/schemas.md`
- Modify: `.agents/skills/designbook/resources/architecture.md`

- [ ] **Step 4.1: Update schemas.md short-form example**

In `.agents/skills/designbook-skill-creator/resources/schemas.md`, replace the short-form example (around line 305-308):

```yaml
each:
  component: "component"
```

with:

```yaml
each:
  component: "components"
```

- [ ] **Step 4.2: Update schemas.md long-form example**

In `.agents/skills/designbook-skill-creator/resources/schemas.md`, replace the long-form example (around line 312-316):

```yaml
each:
  component:
    expr: "component"
    schema: { $ref: ../schemas.yml#/Component }
```

with:

```yaml
each:
  component:
    expr: "components"
    schema: { $ref: ../schemas.yml#/Component }
```

- [ ] **Step 4.3: Update schemas.md dependent-axes example**

In `.agents/skills/designbook-skill-creator/resources/schemas.md`, replace the dependent-axes example (around line 328-335):

```yaml
each:
  component:
    expr: "component"
    schema: { $ref: ../schemas.yml#/Component }
  variant:
    expr: "component.variants"
    schema: { $ref: ../schemas.yml#/Variant }
```

with:

```yaml
each:
  component:
    expr: "components"
    schema: { $ref: ../schemas.yml#/Component }
  variant:
    expr: "component.variants"
    schema: { $ref: ../schemas.yml#/Variant }
```

- [ ] **Step 4.4: Search architecture.md for `expr: "component"` references**

Run: `grep -n 'expr.*"component"' .agents/skills/designbook/resources/architecture.md`

For each result, if the surrounding context is the design-component / shell / screen domain (i.e. the outer scope key was `component[]`), update `expr: "component"` to `expr: "components"`. Leave inner-binding references like `expr: "component.variants"` alone.

- [ ] **Step 4.5: Commit**

```bash
git add .agents/skills/designbook-skill-creator/resources/schemas.md \
        .agents/skills/designbook/resources/architecture.md
git commit -m "docs(skill): update each: examples to outer-plural convention"
```

---

## Task 5: Verify Step A end-to-end with avatar fixture

**Files:** none modified.

- [ ] **Step 5.1: Rebuild test workspace from scratch**

Run from repo root:

```bash
rm -rf workspaces/drupal-petshop
./scripts/setup-workspace.sh drupal-petshop
./scripts/setup-test.sh drupal-petshop design-component --into workspaces/drupal-petshop
```

Expected: workspace recreated, fixtures layered. No errors.

- [ ] **Step 5.2: Start Storybook**

```bash
cd workspaces/drupal-petshop
_debo() { npx storybook-addon-designbook "$@"; }
eval "$(_debo config)"
_debo storybook start
```

Expected: Storybook URL printed.

- [ ] **Step 5.3: Run interactive intake path**

In the workspace, drive `_debo workflow create --workflow design-component` and submit intake interactively (single avatar component, three variants small/medium/large), then submit the create-component and create-variant-story tasks per the existing flow.

Expected at each `workflow done` reply:
- After intake submission, `data.scope.components` exists (was `data.scope.component`).
- The `component` stage expands four tasks: one `create-component` and three `create-variant-story` tasks (one per variant).

- [ ] **Step 5.4: Verify Storybook renders**

Open `http://localhost:<port>/?path=/story/drupal-petshop-data-display-avatar--default` in the browser (port from `_debo storybook status`).

Expected: avatar stories render for default + small/medium/large variants without console errors.

- [ ] **Step 5.5: Run pnpm check**

From repo root:

```bash
pnpm check
```

Expected: typecheck → lint → test all pass.

- [ ] **Step 5.6: Commit anything that changed during verification (none expected)**

If `git status` is clean, skip. Otherwise:

```bash
git add -A
git commit -m "chore: verification artifacts for components[] rename"
```

---

## Task 6: Add `components` workflow param to design-component.md

**Files:**
- Modify: `.agents/skills/designbook/design/workflows/design-component.md`

- [ ] **Step 6.1: Add components param**

In `.agents/skills/designbook/design/workflows/design-component.md`, replace the `params:` block:

```yaml
params:
  component_id: { type: string }
  reference_url: { type: string, default: "" }
  reference_folder:
    type: string
    resolve: reference_folder
    from: reference_url
  breakpoints:
    type: string
    resolve: breakpoints
    from: story_id
```

with:

```yaml
params:
  component_id: { type: string }
  reference_url: { type: string, default: "" }
  reference_folder:
    type: string
    resolve: reference_folder
    from: reference_url
  breakpoints:
    type: string
    resolve: breakpoints
    from: story_id
  components:
    type: array
    items:
      $ref: ../schemas.yml#/Component
```

- [ ] **Step 6.2: Commit**

```bash
git add .agents/skills/designbook/design/workflows/design-component.md
git commit -m "feat(skill): design-component accepts pre-supplied components[] param"
```

---

## Task 7: Add `initialScope` to `workflowCreate`

**Files:**
- Modify: `packages/storybook-addon-designbook/src/workflow.ts`

- [ ] **Step 7.1: Extend workflowCreate signature**

In `packages/storybook-addon-designbook/src/workflow.ts`, locate the `workflowCreate` function (around line 346). The current signature ends with `envMap?: Record<string, string>,`. Add a new optional trailing parameter `initialScope?: Record<string, unknown>`:

Replace:

```typescript
export function workflowCreate(
  dataDir: string,
  workflowId: string,
  title: string,
  tasks: Array<{
    id: string;
    title: string;
    type: string;
    step?: string;
    stage?: string;
    files?: Array<{ path: string; key: string; validators: string[] }>;
    result?: Record<
      string,
      {
        path?: string;
        schema?: object;
        validators?: string[];
        submission?: 'data' | 'direct';
        flush?: 'deferred' | 'immediate';
      }
    >;
    task_file?: string;
    rules?: string[];
    blueprints?: string[];
    config_rules?: string[];
    config_instructions?: string[];
  }>,
  stages?: Record<string, StageDefinition>,
  parent?: string,
  stageLoaded?: Record<string, StageLoadedEntry>,
  engine?: string,
  initialParams?: Record<string, unknown>,
  workspaceRoot?: string,
  schemas?: Record<string, object>,
  envMap?: Record<string, string>,
): string {
```

with:

```typescript
export function workflowCreate(
  dataDir: string,
  workflowId: string,
  title: string,
  tasks: Array<{
    id: string;
    title: string;
    type: string;
    step?: string;
    stage?: string;
    files?: Array<{ path: string; key: string; validators: string[] }>;
    result?: Record<
      string,
      {
        path?: string;
        schema?: object;
        validators?: string[];
        submission?: 'data' | 'direct';
        flush?: 'deferred' | 'immediate';
      }
    >;
    task_file?: string;
    rules?: string[];
    blueprints?: string[];
    config_rules?: string[];
    config_instructions?: string[];
  }>,
  stages?: Record<string, StageDefinition>,
  parent?: string,
  stageLoaded?: Record<string, StageLoadedEntry>,
  engine?: string,
  initialParams?: Record<string, unknown>,
  workspaceRoot?: string,
  schemas?: Record<string, object>,
  envMap?: Record<string, string>,
  initialScope?: Record<string, unknown>,
): string {
```

- [ ] **Step 7.2: Seed `data.scope` when initialScope is provided**

In the same `workflowCreate` function, locate the `data: WorkflowFile = { ... }` literal. Add `scope` to the spread, right after `env_map`:

Replace:

```typescript
    ...(envMap && Object.keys(envMap).length > 0 ? { env_map: envMap } : {}),
    tasks: tasks.map((t, i) => ({
```

with:

```typescript
    ...(envMap && Object.keys(envMap).length > 0 ? { env_map: envMap } : {}),
    ...(initialScope && Object.keys(initialScope).length > 0 ? { scope: initialScope } : {}),
    tasks: tasks.map((t, i) => ({
```

- [ ] **Step 7.3: Run typecheck to confirm signature change is consistent**

```bash
pnpm --filter storybook-addon-designbook typecheck
```

Expected: PASS.

- [ ] **Step 7.4: Commit**

```bash
git add packages/storybook-addon-designbook/src/workflow.ts
git commit -m "feat(workflow): workflowCreate accepts optional initialScope to seed data.scope"
```

---

## Task 8: Wire intake-skip into CLI `workflow create`

**Files:**
- Modify: `packages/storybook-addon-designbook/src/cli/workflow.ts`

- [ ] **Step 8.1: Detect components param and clear firstTask**

In `packages/storybook-addon-designbook/src/cli/workflow.ts`, locate the block (around lines 287-306) that builds `firstTask`. Add a skip-decision *before* that block, then conditionally clear the task list and pass an `initialScope` argument.

Replace:

```typescript
        const firstTaskId = firstStepName ?? 'task-1';
        const firstTask =
          firstStepName && firstStageName && firstResolved
            ? [
                {
                  id: firstTaskId,
                  title: `${title}: ${firstStepName}`,
                  type: 'data' as const,
                  step: firstStepName,
                  stage: firstStageName,
                  files: [] as Array<{ path: string; key: string; validators: string[] }>,
                  ...(firstResult ? { result: firstResult } : {}),
                  task_file: firstResolved.task_file,
                  rules: firstResolved.rules,
                  blueprints: firstResolved.blueprints,
                  config_rules: firstResolved.config_rules,
                  config_instructions: firstResolved.config_instructions,
                },
              ]
            : [];

        const workspaceRoot = (config.workspace as string | undefined) ?? configDir;
        const envMap = buildEnvMap(config);
        const name = workflowCreate(
          config.data,
          opts.workflow,
          title,
          firstTask,
          resolved.stages,
          opts.parent,
          resolved.step_resolved,
          resolved.engine,
          initialParams,
          workspaceRoot,
          firstSchemas,
          envMap,
        );
```

with:

```typescript
        const firstTaskId = firstStepName ?? 'task-1';

        // Intake-skip: when caller passes a non-empty `components` param to
        // design-component, seed scope from it and emit zero intake tasks. The
        // engine's "stage with no tasks → keep walking" path then transitions
        // straight to the next stage, which expands from the seeded scope.
        const skipIntake =
          opts.workflow === 'design-component' &&
          Array.isArray(initialParams?.components) &&
          (initialParams!.components as unknown[]).length > 0;
        const initialScope: Record<string, unknown> | undefined = skipIntake
          ? { components: initialParams!.components }
          : undefined;

        const firstTask =
          !skipIntake && firstStepName && firstStageName && firstResolved
            ? [
                {
                  id: firstTaskId,
                  title: `${title}: ${firstStepName}`,
                  type: 'data' as const,
                  step: firstStepName,
                  stage: firstStageName,
                  files: [] as Array<{ path: string; key: string; validators: string[] }>,
                  ...(firstResult ? { result: firstResult } : {}),
                  task_file: firstResolved.task_file,
                  rules: firstResolved.rules,
                  blueprints: firstResolved.blueprints,
                  config_rules: firstResolved.config_rules,
                  config_instructions: firstResolved.config_instructions,
                },
              ]
            : [];

        const workspaceRoot = (config.workspace as string | undefined) ?? configDir;
        const envMap = buildEnvMap(config);
        const name = workflowCreate(
          config.data,
          opts.workflow,
          title,
          firstTask,
          resolved.stages,
          opts.parent,
          resolved.step_resolved,
          resolved.engine,
          initialParams,
          workspaceRoot,
          firstSchemas,
          envMap,
          initialScope,
        );
```

- [ ] **Step 8.2: Adjust task_ids output for skip path**

Still in `cli/workflow.ts`, find the block right after `workflowCreate(...)`:

```typescript
        // Build task_ids map: step name → actual task ID
        const taskIds: Record<string, string> = {};
        if (firstStepName) {
          taskIds[firstStepName] = firstTaskId;
        }
```

Replace it with:

```typescript
        // Build task_ids map: step name → actual task ID. When intake was
        // skipped, no first task was emitted, so leave the map empty.
        const taskIds: Record<string, string> = {};
        if (firstStepName && !skipIntake) {
          taskIds[firstStepName] = firstTaskId;
        }
```

- [ ] **Step 8.3: Run typecheck**

```bash
pnpm --filter storybook-addon-designbook typecheck
```

Expected: PASS.

- [ ] **Step 8.4: Commit**

```bash
git add packages/storybook-addon-designbook/src/cli/workflow.ts
git commit -m "feat(cli): design-component skips intake when components param supplied"
```

---

## Task 9: Add CLI integration test for skip path

**Files:**
- Create: `packages/storybook-addon-designbook/src/cli/__tests__/workflow-skip-intake.test.ts`

- [ ] **Step 9.1: Inspect existing CLI test conventions**

Run: `ls packages/storybook-addon-designbook/src/cli/__tests__/`

Pick the most recent workflow-related test file and read it to confirm the conventions for spawning the CLI in tests, fixturing config/data dirs, and asserting on tasks.yml output. Reuse the same scaffolding (fs-temp dirs, helper imports) in the new file.

- [ ] **Step 9.2: Write the failing integration test**

Create `packages/storybook-addon-designbook/src/cli/__tests__/workflow-skip-intake.test.ts`. Mirror existing CLI integration tests in this directory for setup/teardown patterns. The test must:

1. Set up a temporary config + data dir.
2. Invoke `workflow create --workflow design-component --params components='[{"component":"avatar","slots":[],"variants":[]}]'` (use the in-process command runner the other CLI tests use, not a child process, unless the existing tests use child processes).
3. Read the resulting `<dataDir>/workflows/changes/<name>/tasks.yml`.
4. Assert: `data.tasks` is an empty array; `data.scope.components` exists and equals the passed array; `data.current_stage` is `intake` (the first stage; transition happens on first `workflow done`).
5. Invoke `workflow done --workflow <name>` with no `--data` (no current task to submit; this triggers stage transition from empty intake → component stage).
6. Read tasks.yml again. Assert: `data.tasks.length` is now `>= 1` (component stage tasks were expanded from scope), and at least one task has `step: 'create-component'`.

If the existing CLI tests have their own helper for "create then assert" flows, follow that pattern verbatim.

- [ ] **Step 9.3: Run the new test (expect FAIL until implementation is complete)**

Note: If Tasks 6–8 are already done, the test should PASS on first run. If you split execution and only Task 6 was done before reaching here, run:

```bash
pnpm --filter storybook-addon-designbook vitest run src/cli/__tests__/workflow-skip-intake.test.ts
```

Expected: PASS (Tasks 6–8 already implemented).

- [ ] **Step 9.4: Commit**

```bash
git add packages/storybook-addon-designbook/src/cli/__tests__/workflow-skip-intake.test.ts
git commit -m "test(cli): integration test for design-component intake skip"
```

---

## Task 10: Add e2e fixture for skip-intake

**Files:**
- Create: `fixtures/drupal-petshop/cases/design-component-skip-intake.yaml`

- [ ] **Step 10.1: Inspect existing case format**

Read `fixtures/drupal-petshop/cases/design-component.yaml` to learn the `prompt`, `fixtures`, and any other top-level fields the test runner expects.

- [ ] **Step 10.2: Write the new fixture**

Create `fixtures/drupal-petshop/cases/design-component-skip-intake.yaml`. Mirror the existing case structure, but the `prompt` should instruct the agent to skip intake by passing the avatar Component spec as a `components=...` param to `_debo workflow create`. Concretely the prompt should tell the agent to run:

```bash
_debo workflow create --workflow design-component --params components='[{
  "component": "avatar",
  "group": "Data Display",
  "description": "Displays a user photo, name, and role label.",
  "slots": [
    {"id": "photo", "title": "Photo", "description": "User profile image."},
    {"id": "name",  "title": "Name",  "description": "User display name."},
    {"id": "role",  "title": "Role",  "description": "Role or title label below the name."}
  ],
  "variants": [
    {"id": "small",  "title": "Small",  "description": "Compact avatar."},
    {"id": "medium", "title": "Medium", "description": "Default size."},
    {"id": "large",  "title": "Large",  "description": "Prominent avatar."}
  ]
}]'
```

…and then continue the workflow normally (`workflow done` for each create-* task as they appear). The expected outcome is identical to `design-component.yaml`: `components/avatar/avatar.{component.yml,twig,default.story.yml,small.story.yml,medium.story.yml,large.story.yml}` plus `.avatar*` CSS rules in `css/app.src.css`.

- [ ] **Step 10.3: Commit**

```bash
git add fixtures/drupal-petshop/cases/design-component-skip-intake.yaml
git commit -m "test(fixture): petshop case for design-component intake skip"
```

---

## Task 11: End-to-end verification of skip path

**Files:** none modified.

- [ ] **Step 11.1: Rebuild fresh workspace**

```bash
rm -rf workspaces/drupal-petshop
./scripts/setup-workspace.sh drupal-petshop
./scripts/setup-test.sh drupal-petshop design-component-skip-intake --into workspaces/drupal-petshop
```

Expected: workspace ready, no errors.

- [ ] **Step 11.2: Start Storybook**

```bash
cd workspaces/drupal-petshop
_debo() { npx storybook-addon-designbook "$@"; }
eval "$(_debo config)"
_debo storybook start
```

Expected: URL printed.

- [ ] **Step 11.3: Execute the case prompt**

Read `fixtures/drupal-petshop/cases/design-component-skip-intake.yaml` and run the prompt as the test runner would. Crucially, after the `workflow create` invocation:

- The CLI response must show `tasks: []` (intake skipped).
- A subsequent `_debo workflow done --workflow <name>` (no `--data`) must transition into the `component` stage and report `expanded_tasks` containing one `create-component` task and three `create-variant-story` tasks.

Submit each create-* task as the existing avatar flow does (use `--data` for the create-component payload).

- [ ] **Step 11.4: Verify Storybook output is identical to non-skip path**

Open the avatar stories in the browser (default + 3 variants). Compare against the artifacts produced in Task 5.4. Files in `components/avatar/` and the `.avatar*` rules in `css/app.src.css` should match exactly.

- [ ] **Step 11.5: Run pnpm check**

From repo root:

```bash
pnpm check
```

Expected: typecheck → lint → test all pass.

- [ ] **Step 11.6: Final commit (if any verification artifacts changed)**

If `git status` is clean, skip. Otherwise:

```bash
git add -A
git commit -m "chore: verify design-component intake skip end-to-end"
```

---

## Self-Review Notes

- Step A is split into three rename commits (Task 1: intake schemas, Task 2: create-component each, Task 3: create-variant-story each) plus one doc-update commit (Task 4). Each is independently reverable.
- Task 5 is the verification gate between Step A and Step B — if avatar still works after the rename, the engine's outer/inner naming behaves as analyzed.
- Step B is split into one skill commit (Task 6: workflow param), one engine commit (Task 7: workflowCreate signature), one CLI commit (Task 8: skip wiring), one test commit (Task 9), and one fixture commit (Task 10).
- Task 11 is the final E2E gate covering both steps.
- No migration code; existing in-flight workflows that used `scope.component` are disposable per CLAUDE.md.
- Inner binding `expr: "component.variants"` in create-variant-story is intentionally unchanged — it always referred to the inner per-iteration binding, which now has the same name but is unambiguous.
