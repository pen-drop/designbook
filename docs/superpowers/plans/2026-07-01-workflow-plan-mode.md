# Workflow Plan Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a plan mode that captures a workflow's interactive (intake) decisions into a plaintext plan, then replays it so the workflow runs autonomously.

**Architecture:** One new primitive — `interactive: true` on a stage — surfaced in the `workflow create` response exactly like the existing `isolate` flag. `debo <wf> --plan` runs the interactive prefix with the human and writes `<wf>.plan.md`; `debo <wf> --from-plan <file>` re-runs the interactive stage reading the plan instead of asking, then runs the deterministic tail. The pre-existing static compiler currently called `plan` is renamed `runbook` to free the name. Most behavior is skill authoring (task bodies + execution rules); the only engine change is parsing/emitting the flag and the rename.

**Tech Stack:** TypeScript (Node, commander, vitest), `js-yaml`, designbook skill markdown (tasks/rules/workflows).

## Global Constraints

- Run `pnpm check` (typecheck → lint → test, fail-fast) before every TS commit. Verbatim: `pnpm check`.
- Auto-fix formatting: `pnpm --filter storybook-addon-designbook lint:fix`.
- **No migration / backwards-compat / legacy-artifact code.** On-disk artifacts are disposable; update the writer/reader to the new shape, never read old shapes.
- Before creating OR editing any task / rule / blueprint / workflow / schemas.yml under `.agents/skills/designbook*/`, **load `designbook-skill-creator` first** (load the matching per-file-type rule + `common-rules.md`). This is mandatory.
- For TypeScript changes under `packages/storybook-addon-designbook/`, use `designbook-addon-skills`.
- TS tasks are TDD (write failing test first). Skill-authoring tasks verify via a test-workspace run (`./scripts/setup-workspace.sh`) since prose is not unit-testable.
- `_debo` = `npx storybook-addon-designbook`.

---

### Task 1: Rename static compiler `plan` → `runbook`

Mechanical rename of the existing static-compiler command so `plan` is free. Only `src/cli/plan.ts` and `src/cli.ts` import `src/plan/`; scope is contained.

**Files:**
- Rename: `packages/storybook-addon-designbook/src/plan/` → `src/runbook/` (all: `anchors.ts`, `examples.ts`, `render.ts`, `resolve.ts`, `reverse-index.ts`, `sources.ts`, `__tests__/`)
- Rename: `packages/storybook-addon-designbook/src/cli/plan.ts` → `src/cli/runbook.ts`
- Rename: `packages/storybook-addon-designbook/src/cli/__tests__/plan.test.ts` → `src/cli/__tests__/runbook.test.ts`
- Modify: `packages/storybook-addon-designbook/src/cli.ts:8,133`

**Interfaces:**
- Produces: CLI command `runbook <workflow>`; exported `register` in `src/cli/runbook.ts` (imported as `registerRunbook`). No behavior change — same markdown output.

- [ ] **Step 1: Move the module and cli file with git mv**

```bash
cd packages/storybook-addon-designbook
git mv src/plan src/runbook
git mv src/cli/plan.ts src/cli/runbook.ts
git mv src/cli/__tests__/plan.test.ts src/cli/__tests__/runbook.test.ts
```

- [ ] **Step 2: Fix imports + command name in `src/cli/runbook.ts`**

Change the two internal imports (`../plan/resolve.js` → `../runbook/resolve.js`, `../plan/render.js` → `../runbook/render.js`) and the command registration:

```typescript
program
  .command('runbook <workflow>')
  .description('Resolve a workflow definition into a self-contained markdown runbook written to stdout.')
```

- [ ] **Step 3: Update `src/cli.ts` import + registration**

```typescript
// line 8
import { register as registerRunbook } from './cli/runbook.js';
// line 133
registerRunbook(program);
```

- [ ] **Step 4: Update the test's command name expectation**

In `src/cli/__tests__/runbook.test.ts`, replace the parse argument `'plan'` with `'runbook'` (e.g. `program.parseAsync(['node', 'test', 'runbook', 'design-screen'])`) and the import `registerPlan` → `registerRunbook`. Leave every output assertion unchanged.

- [ ] **Step 5: Update any lingering `plan/` import path references**

Run: `grep -rn "cli/plan\|plan/render\|plan/resolve\|plan/sources\|plan/anchors\|plan/examples\|plan/reverse-index\|registerPlan" src` — expected: no hits. Fix any that remain.

- [ ] **Step 6: Run check**

Run: `pnpm check`
Expected: PASS (typecheck, lint, all tests including `runbook.test.ts`).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: rename static workflow compiler plan -> runbook"
```

---

### Task 2: Engine — surface `interactive: true` on stages

Mirror the existing `isolate` flag end-to-end so the `workflow create` response carries `interactive: true` for a stage that declares it.

**Files:**
- Modify: `packages/storybook-addon-designbook/src/workflow-resolve.ts` (`StageDefinitionFm` ~line 100; `ResolvedStep` ~line 1780; resolve loop ~1856–1865; emit ~1977, 1988)
- Modify: `packages/storybook-addon-designbook/src/cli/workflow.ts:106`
- Test: `packages/storybook-addon-designbook/src/validators/__tests__/workflow-resolve.test.ts`

**Interfaces:**
- Produces: `ResolvedStep.interactive?: boolean`; `stepResolved[step].interactive === true` in the `workflow create` response when the step's stage has `interactive: true`.

- [ ] **Step 1: Write the failing test**

Add to `src/validators/__tests__/workflow-resolve.test.ts` (follow the file's existing pattern for building a resolved-steps map from a fixture workflow whose stage declares `interactive: true`):

```typescript
it('surfaces interactive:true on a step whose stage declares it', () => {
  // Arrange: a workflow with stage `intake: { steps: [intake], interactive: true }`
  const resolved = resolveStepsForFixture('interactive-stage'); // helper as used by sibling tests
  const step = Array.isArray(resolved['intake']) ? resolved['intake'][0] : resolved['intake'];
  expect(step.interactive).toBe(true);
});
```

If the file has no reusable fixture helper, replicate the arrange block a sibling `isolate` test uses and add `interactive: true` to the stage.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter storybook-addon-designbook test -- workflow-resolve`
Expected: FAIL — `step.interactive` is `undefined`.

- [ ] **Step 3: Add `interactive` to `StageDefinitionFm`**

`src/workflow-resolve.ts` ~line 105, next to `isolate?: boolean;`:

```typescript
  interactive?: boolean;
```

- [ ] **Step 4: Add `interactive` to `ResolvedStep`**

`src/workflow-resolve.ts` ~line 1781, next to the `isolate?` field:

```typescript
  /** True when the step's stage declared `interactive: true`. Drives plan capture/replay. */
  interactive?: boolean;
```

- [ ] **Step 5: Read the flag in the resolve loop**

`src/workflow-resolve.ts` ~line 1856, alongside `let isolate = false;`:

```typescript
    let interactive = false;
```

and inside the stage loop, next to `if (stageDef.isolate) isolate = true;`:

```typescript
        if (stageDef.interactive) interactive = true;
```

- [ ] **Step 6: Emit it on both stepResolved branches**

`src/workflow-resolve.ts` at ~1977 and ~1988, next to `...(isolate ? { isolate: true } : {}),`:

```typescript
        ...(interactive ? { interactive: true } : {}),
```

- [ ] **Step 7: Emit it from the create-response builder**

`src/cli/workflow.ts:106`, next to `...(stage.isolate ? { isolate: true } : {}),`:

```typescript
    ...(stage.interactive ? { interactive: true } : {}),
```

- [ ] **Step 8: Run test to verify it passes**

Run: `pnpm --filter storybook-addon-designbook test -- workflow-resolve`
Expected: PASS.

- [ ] **Step 9: Run full check + commit**

```bash
pnpm check
git add -A
git commit -m "feat(workflow): surface interactive flag on stages in create response"
```

---

### Task 3: design-screen — mark intake interactive + move it first

Load `designbook-skill-creator` (rules/workflow-files.md + common-rules.md) before editing. Interactive stages must run first so plan capture is the minimal prefix; `intake` declares no dependency on `reference` (its body notes reference runs after intake).

**Files:**
- Modify: `.agents/skills/designbook/design/workflows/design-screen.md` (the `stages:` block)

**Interfaces:**
- Produces: `design-screen` stage order with `intake` first and `interactive: true`; `reference` follows.

- [ ] **Step 1: Load the authoring skill**

Load `designbook-skill-creator`; read `rules/workflow-files.md` and `rules/common-rules.md`.

- [ ] **Step 2: Reorder + flag the stages**

Edit the `stages:` block so `intake` is first and carries the flag, `reference` second. Keep every other key (`steps`, `domain`, `isolate`) exactly as-is:

```yaml
stages:
  intake:
    steps: [intake]
    domain: [data-model]
    interactive: true
  reference:
    steps: [extract-reference]
    isolate: true
  component:
    steps: [create-component]
    isolate: true
  sample-data:
    steps: [create-sample-data]
  entity-mapping:
    steps: [map-entity]
  scene:
    steps: [create-scene]
    domain: [data-model]
    isolate: true
```

- [ ] **Step 3: Verify the runbook still resolves**

Run: `_debo runbook design-screen | head -40`
Expected: renders without error; stages table lists `intake` first.

- [ ] **Step 4: Verify create surfaces the flag**

In a test workspace with fixtures (`./scripts/setup-workspace.sh planmode` from repo root, then inside it):
Run: `_debo workflow create --workflow design-screen` and inspect the response.
Expected: `step_resolved["intake"].interactive === true`; `intake` is the in-progress task.

- [ ] **Step 5: Commit**

```bash
git add .agents/skills/designbook/design/workflows/design-screen.md
git commit -m "feat(design-screen): mark intake interactive, run it first"
```

---

### Task 4: Capture flow — `--plan` writes `<wf>.plan.md`

Load `designbook-skill-creator` before editing task/rule files. This task defines the plan-file format, teaches the dispatcher to accept `--plan`, and makes the execution loop stop after the last interactive stage and write the plan.

**Files:**
- Modify: `.agents/skills/designbook/SKILL.md` (flag parsing in the Global Flags / Dispatch section)
- Modify: `.agents/skills/designbook/resources/workflow-execution.md` (new "Plan mode — capture" section)
- Modify: `.agents/skills/designbook/design/tasks/intake--design-screen.md` (emit decisions to the plan on capture)

**Interfaces:**
- Consumes: `interactive: true` from Task 2/3 (execution loop reads it from `step_resolved`).
- Produces: `<wf>.plan.md` written at `$DESIGNBOOK_DATA/plans/<wf>.plan.md`; a documented plaintext plan format (below).

- [ ] **Step 1: Load the authoring skill**

Load `designbook-skill-creator`; read `rules/task-files.md`, `rules/common-rules.md`.

- [ ] **Step 2: Add `--plan` / `--from-plan` to SKILL.md Global Flags**

Add two rows to the Global Flags table and a parse note (flags are stripped from `$ARGUMENTS` before dispatch, like `--optimize`):

```markdown
| `--plan` | User-facing | Run only the interactive prefix (stages with `interactive: true`) with the user, then write `$DESIGNBOOK_DATA/plans/<workflow>.plan.md` and stop. Do not run deterministic stages. |
| `--from-plan <file>` | User-facing | Autonomous run: interactive stages read `<file>` instead of asking the user; deterministic stages run to completion. |
```

- [ ] **Step 3: Define the plan-file format in workflow-execution.md**

Add a "Plan mode — capture (`--plan`)" section documenting the exact plaintext template the interactive task must write. The format (matches the spec — resolved params, decisions as prose, freeform notes):

```markdown
# Plan: <workflow-id>

## Params
<key>: <resolved value>   # one per resolved workflow param, including any the user corrected

## Decisions
<one prose line or short block per interactive decision, e.g.>
Section: blog
Screen type: landing
Embedded entity lists: article (teaser)
Entities: article, author
Components (new): hero, article-card, author-badge

## Notes
<freeform tacit intent the schema does not capture, verbatim from the user; empty if none>
```

- [ ] **Step 4: Add the capture control-flow to workflow-execution.md**

In the same section, state the loop rule:

```markdown
When `--plan` is active:
1. Create the workflow and run the task loop normally for every step whose stage has `interactive: true` (ask the user as usual).
2. After the last interactive step is `done`, do NOT continue into deterministic stages. Instead write `$DESIGNBOOK_DATA/plans/<workflow>.plan.md` using the format above, then `_debo workflow abandon --workflow $WORKFLOW_NAME`.
3. Report the plan path to the user.
```

- [ ] **Step 5: Teach the intake task to emit its decisions on capture**

In `intake--design-screen.md`, add a step (after the summary/confirmation) guarded by plan mode: "When running under `--plan`, after the user confirms the build plan, append the confirmed section, screen type, embedded lists, entity list, component list, and any freeform notes to the plan file's `## Decisions` / `## Notes` sections per workflow-execution.md." Keep the normal (non-plan) flow unchanged.

- [ ] **Step 6: Verify capture end-to-end in a test workspace**

From repo root: `./scripts/setup-workspace.sh planmode`. Inside the workspace, run `debo design-screen --plan`, answer the intake prompts, and confirm.
Expected: `$DESIGNBOOK_DATA/plans/design-screen.plan.md` exists with `## Params`, `## Decisions`, `## Notes`; no component/scene files were created; workflow was abandoned.

- [ ] **Step 7: Commit**

```bash
git add .agents/skills/designbook/SKILL.md .agents/skills/designbook/resources/workflow-execution.md .agents/skills/designbook/design/tasks/intake--design-screen.md
git commit -m "feat(debo): --plan captures interactive decisions to <wf>.plan.md"
```

---

### Task 5: Replay flow — `--from-plan` runs autonomously

Load `designbook-skill-creator` before editing. Make the interactive stage read the plan instead of asking, add the degrade rule, and let the deterministic tail run unattended.

**Files:**
- Modify: `.agents/skills/designbook/resources/workflow-execution.md` (new "Plan mode — replay" section)
- Modify: `.agents/skills/designbook/design/tasks/intake--design-screen.md` (read plan on replay)

**Interfaces:**
- Consumes: `<wf>.plan.md` from Task 4 (`## Params`, `## Decisions`, `## Notes`).
- Produces: a completed autonomous run (engine auto-archives when all tasks done).

- [ ] **Step 1: Load the authoring skill**

Load `designbook-skill-creator`; read `rules/task-files.md`, `rules/common-rules.md`.

- [ ] **Step 2: Add the replay control-flow to workflow-execution.md**

```markdown
When `--from-plan <file>` is active:
1. Read `<file>`. Pass its `## Params` as `--params` to `workflow create`.
2. For every step whose stage has `interactive: true`: do NOT call `workflow wait`. Produce the step's result from the plan's `## Decisions` + `## Notes` + the CURRENT on-disk files (data-model, vision, scenes read fresh). Then `workflow done`.
3. Run all deterministic stages normally, with no user interaction.
4. The engine auto-archives when every task is done — that is completion.

Degrade rule: if an interactive step needs a decision the plan does not cover, fall back to `workflow wait` and ask the user for that one decision. Never guess.
```

- [ ] **Step 3: Teach intake to consume the plan on replay**

In `intake--design-screen.md`, add a branch at the top of the task: "When running under `--from-plan`, read the plan file. Derive `section_id`, screen type, embedded lists, entity mappings, and component plan from `## Decisions` + `## Notes`, resolving details against the current data-model and section scenes. Do not ask the user. If a required decision is absent from the plan, `workflow wait` for that single decision (degrade rule)." Keep the interactive flow as the default when no plan is active.

- [ ] **Step 4: Verify replay end-to-end in a test workspace**

Using the `design-screen.plan.md` produced in Task 4, run `debo design-screen --from-plan $DESIGNBOOK_DATA/plans/design-screen.plan.md`.
Expected: runs with zero prompts; produces the component + scene artifacts; workflow auto-archives. Compare the result to an equivalent fully-interactive run — the built screen should match.

- [ ] **Step 5: Verify the degrade rule**

Remove the `Screen type:` line from the plan file, re-run `--from-plan`.
Expected: the run pauses once to ask screen type, then completes autonomously.

- [ ] **Step 6: Commit**

```bash
git add .agents/skills/designbook/resources/workflow-execution.md .agents/skills/designbook/design/tasks/intake--design-screen.md
git commit -m "feat(debo): --from-plan replays interactive decisions for autonomous runs"
```

---

## Self-Review

**Spec coverage:**
- Naming/rename → Task 1. ✓
- `interactive: true` primitive → Task 2 (engine) + Task 3 (design-screen). ✓
- `--plan` capture + plaintext `<wf>.plan.md` (params + decisions + notes) → Task 4. ✓
- `--from-plan` replay, files-read-fresh, engine auto-archive termination, degrade rule → Task 5. ✓
- Interactive-stages-first caveat/action (move intake before reference) → Task 3. ✓
- "No scope-seeding in engine; interactive task consumes plan itself" → Tasks 4/5 keep consumption in the task body, engine change limited to the flag. ✓
- Out-of-scope items (manifests, structured plan, snapshots, fallback/queue) → not planned. ✓

**Placeholder scan:** No TBD/TODO. TS steps carry real code; skill steps carry exact file paths, the plan-file template, and control-flow prose. Skill tasks state their verification is a test-workspace run because prose is not vitest-testable (honest, not a placeholder).

**Type consistency:** `interactive?: boolean` added consistently to `StageDefinitionFm`, `ResolvedStep`, and emitted via `stage.interactive` in `cli/workflow.ts` — mirrors the existing `isolate` names exactly. `registerRunbook` used consistently in Task 1. Plan-file sections (`## Params` / `## Decisions` / `## Notes`) referenced identically in Tasks 4 and 5.
