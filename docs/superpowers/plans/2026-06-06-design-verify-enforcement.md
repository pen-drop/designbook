# Design Verify Enforcement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** CLI-enforced `after:` workflows (design workflows can never silently skip design-verify), child results aggregated into the parent's summary, JSONata metric for debo-test research, and the verify split (`verify-capture`/`verify-fix`) reverted into one `design-verify` workflow.

**Architecture:** The workflow CLI gains real `after:` semantics: when a parent workflow's last task completes, the CLI auto-creates the declared child workflows (params mapped via JSONata), holds the parent in a new `awaiting-after` status, and archives it only when all children complete with schema-valid results. `workflow summary` aggregates child results under `after.<workflow>` and can evaluate a JSONata metric expression. Skill-side, `design-verify` becomes one workflow again (measure → fix → re-measure via distinct `re-capture`/`re-compare` step names) and debo-test reads its decision metric from the case yaml.

**Tech Stack:** TypeScript (commander CLI, js-yaml, jsonata 2.x, vitest), designbook skill markdown files.

**Spec:** `docs/superpowers/specs/2026-06-06-design-verify-enforcement-design.md`

**Scoring semantics (memorize):** lower VerifyResult `score` is better. `delta = first_shot.score − final.score`; positive delta = the fix pass improved fidelity.

---

## Ground rules

- Work happens on a new branch off `main`.
- Phase 1 = addon TypeScript. Load the `designbook-addon-skills` skill before starting Task 1. Run `pnpm check` (typecheck → lint → test) before every commit; `pnpm --filter storybook-addon-designbook lint:fix` auto-fixes formatting.
- Phase 2 = skill markdown files. Load the `designbook-skill-creator` skill before starting Task 9 — **mandatory** (CLAUDE.md rule), plus its per-file-type rules (`rules/workflow-files.md`, `rules/task-files.md`, `rules/schema-files.md`, `rules/common-rules.md`).
- No backwards-compat code. Existing on-disk workflow artifacts are disposable (CLAUDE.md rule).
- All addon paths below are relative to `packages/storybook-addon-designbook/`.
- The split-branch sources referenced in Phase 2 live in the worktree `/home/cw/projects/designbook/.claude/worktrees/region-properties-resolver` (branch `feat/region-properties-resolver`). Key content is inlined in the tasks, so the plan works even if that branch is gone.

## Key code anchors (verified 2026-06-06)

| What | Where |
|---|---|
| `WorkflowDefinition` + frontmatter parse | `src/cli/workflow-discovery.ts` (whole file, ~45 lines) |
| `WorkflowFile` meta type (status union, `parent`) | `src/workflow.ts:116-135` |
| `archiveWorkflow()` (status flip, changes/→archive/ move) | `src/workflow.ts:207-225` |
| `workflowDone()` core | `src/workflow.ts:930-1485` (archive call near end) |
| `StageResponse` | `src/workflow.ts:893-912` |
| `workflow create` CLI action (param resolve, intake, `--parent`, `--params`) | `src/cli/workflow.ts:152-409` |
| `workflow done` CLI action | `src/cli/workflow.ts:506-584` |
| `readSummary()` + `SummaryResult` | `src/cli/workflow-summary.ts` |
| JSONata precedent (resolver `from:`) | `src/resolvers/registry.ts:105` |
| WorkflowPanel status mapping / summary render | `src/components/panels/WorkflowPanel.tsx:169-176, 615-620` |
| Test patterns | `src/cli/__tests__/workflow-summary.test.ts`, `workflow-auto-transition.test.ts` |

---

# Phase 1 — CLI (addon)

### Task 1: Parse `after:` declarations in workflow definitions

**Files:**
- Modify: `src/cli/workflow-discovery.ts`
- Test: `src/cli/__tests__/workflow-discovery-after.test.ts` (create)

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { loadWorkflowDefinition } from '../workflow-discovery.js';

function setup(name: string, frontmatter: string) {
  const root = resolve(tmpdir(), `discovery-${name}-${Date.now()}`);
  const wfDir = resolve(root, 'skills', 'designbook', 'design', 'workflows');
  mkdirSync(wfDir, { recursive: true });
  writeFileSync(resolve(wfDir, 'test-wf.md'), `---\n${frontmatter}\n---\n`);
  return root;
}

describe('loadWorkflowDefinition after:', () => {
  it('parses after declarations with param mappings', () => {
    const root = setup('after', [
      'title: Test',
      'stages:',
      '  intake: { steps: [intake] }',
      'after:',
      '  - workflow: design-verify',
      '    params:',
      '      story_id: story_id',
    ].join('\n'));
    const def = loadWorkflowDefinition('test-wf', root);
    expect(def.after).toEqual([
      { workflow: 'design-verify', params: { story_id: 'story_id' } },
    ]);
    rmSync(root, { recursive: true });
  });

  it('returns empty array when after is absent', () => {
    const root = setup('no-after', 'title: Test\nstages:\n  intake: { steps: [intake] }');
    const def = loadWorkflowDefinition('test-wf', root);
    expect(def.after).toEqual([]);
    rmSync(root, { recursive: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter storybook-addon-designbook test -- workflow-discovery-after`
Expected: FAIL — `def.after` is `undefined`.

- [ ] **Step 3: Implement**

In `src/cli/workflow-discovery.ts`:

```ts
export interface AfterDeclaration {
  workflow: string;
  /** Param name → JSONata expression evaluated over the parent's params. */
  params?: Record<string, string>;
}

export interface WorkflowDefinition {
  id: string;
  file: string;
  stages: WorkflowStage[];
  after: AfterDeclaration[];
}
```

In `loadWorkflowDefinition`, extend the frontmatter type and return value:

```ts
const fm = parseYaml(fmMatch[1]!) as {
  stages?: Record<string, { steps?: string[] }>;
  after?: Array<{ workflow?: string; params?: Record<string, string> }>;
} | null;
// ... existing stages mapping ...
const after: AfterDeclaration[] = (fm?.after ?? [])
  .filter((a): a is { workflow: string; params?: Record<string, string> } => typeof a?.workflow === 'string')
  .map((a) => ({ workflow: a.workflow, ...(a.params ? { params: a.params } : {}) }));
return { id: workflowId, file, stages, after };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter storybook-addon-designbook test -- workflow-discovery-after`
Expected: PASS (both tests).

- [ ] **Step 5: Commit**

```bash
git add packages/storybook-addon-designbook/src/cli/workflow-discovery.ts packages/storybook-addon-designbook/src/cli/__tests__/workflow-discovery-after.test.ts
git commit -m "feat(workflow): parse after: declarations from workflow frontmatter"
```

### Task 2: `awaiting-after` status + `children` on WorkflowFile

**Files:**
- Modify: `src/workflow.ts:116-135` (WorkflowFile), `src/components/panels/WorkflowPanel.tsx:77` (status union)

- [ ] **Step 1: Extend the types**

In `src/workflow.ts`, `WorkflowFile`:

```ts
status?: 'running' | 'waiting' | 'awaiting-after' | 'completed' | 'incomplete';
/** Child workflows auto-created from this workflow's after: declarations. */
children?: Array<{ name: string; workflow: string }>;
```

(`parent?: string` already exists — it stores the parent workflow *name* and is set via `workflow create --parent`. It becomes the bottom-up link; no change needed.)

In `src/components/panels/WorkflowPanel.tsx` (~line 77), mirror the status union:

```ts
status?: 'running' | 'waiting' | 'awaiting-after' | 'completed' | 'incomplete';
```

and in `WorkflowStatusDot` (~line 170) and `collapsibleStatus` (~line 174) map `'awaiting-after'` to the running/in-progress visual:

```ts
const mapped = status === 'completed' ? 'done'
  : status === 'running' || status === 'awaiting-after' ? 'in-progress'
  : 'pending';
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter storybook-addon-designbook typecheck` (or `pnpm check` if no script `typecheck` exists — verify in package.json)
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/storybook-addon-designbook/src/workflow.ts packages/storybook-addon-designbook/src/components/panels/WorkflowPanel.tsx
git commit -m "feat(workflow): awaiting-after status and children meta field"
```

### Task 3: workflowDone holds the parent in `awaiting-after`

When the last task completes AND the workflow definition declares `after:` AND no children are registered yet, `workflowDone` must NOT archive — it sets `awaiting-after` and reports that to the caller.

**Files:**
- Modify: `src/workflow.ts` (`workflowDone` options + the all-tasks-done branch that currently calls `archiveWorkflow`, near line 1387)
- Test: `src/cli/__tests__/workflow-awaiting-after.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Follow the setup pattern of `workflow-auto-transition.test.ts` (create a workflow via `workflowCreate`, complete its tasks via `workflowDone`). Core assertions:

```ts
// Pseudocode skeleton — reuse the existing test helpers/fixtures from
// workflow-auto-transition.test.ts for workflowCreate/workflowDone setup.
it('sets awaiting-after instead of archiving when after: is declared', async () => {
  // ... create single-task workflow ...
  const result = await workflowDone(dataDir, name, taskId, undefined, {
    config,
    after: [{ workflow: 'design-verify', params: { story_id: 'story_id' } }],
  });
  expect(result.archived).toBe(false);
  expect(result.awaitingAfter).toEqual([{ workflow: 'design-verify', params: { story_id: 'story_id' } }]);
  const wf = readWorkflowFile(dataDir, name); // changes/, not archive/
  expect(wf.status).toBe('awaiting-after');
});

it('archives normally when after: is empty', async () => {
  const result = await workflowDone(dataDir, name, taskId, undefined, { config, after: [] });
  expect(result.archived).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter storybook-addon-designbook test -- workflow-awaiting-after`
Expected: FAIL — `awaitingAfter` undefined / workflow archived.

- [ ] **Step 3: Implement**

In `workflowDone` options, add `after?: AfterDeclaration[]`. In the all-tasks-done branch (where `archiveWorkflow` is called today):

```ts
const pendingAfter = (options?.after ?? []).length > 0 && !(data.children?.length);
if (allTasksDone && pendingAfter) {
  data.status = 'awaiting-after';
  writeWorkflowAtomic(filePath, data);
  return { archived: false, awaitingAfter: options!.after!, data, response };
}
// existing: archiveWorkflow(dataDir, name, data); return { archived: true, ... }
```

Add `awaitingAfter?: AfterDeclaration[]` to the `workflowDone` return type. Import `AfterDeclaration` from `./cli/workflow-discovery.js` — if that creates an import cycle (workflow.ts ↔ cli/), move `AfterDeclaration` into `src/workflow-types.ts` and re-export from workflow-discovery.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter storybook-addon-designbook test -- workflow-awaiting-after`
Expected: PASS. Also run the full suite: `pnpm --filter storybook-addon-designbook test` — `workflow-auto-transition.test.ts` must still pass (no `after` option → unchanged behavior).

- [ ] **Step 5: Commit**

```bash
git add -A packages/storybook-addon-designbook/src
git commit -m "feat(workflow): hold parent in awaiting-after when after: workflows pending"
```

### Task 4: CLI `workflow done` auto-creates children and returns their ids

**Files:**
- Modify: `src/cli/workflow.ts` (extract create-action body into `runWorkflowCreate`; extend done action)
- Modify: `src/workflow.ts` (add `registerChild` helper)
- Test: `src/cli/__tests__/workflow-after-create.test.ts` (create)

- [ ] **Step 1: Refactor — extract the create action body**

In `src/cli/workflow.ts`, wrap the body of the `workflow create` action (lines 152-409) into an exported function, behavior-identical:

```ts
export interface RunWorkflowCreateOpts {
  workflow: string;
  title?: string;
  parent?: string;
  params?: Record<string, unknown>;
}
export async function runWorkflowCreate(opts: RunWorkflowCreateOpts, config: Config): Promise<{ name: string; /* ...existing createResult fields */ }> {
  // moved action body; `opts.params` already parsed (object, not JSON string)
}
```

The commander `.action` becomes a thin wrapper that parses `--params` JSON and calls `runWorkflowCreate`. Run the full test suite after the refactor — it must be green before proceeding.

- [ ] **Step 2: Commit the refactor**

```bash
git add packages/storybook-addon-designbook/src/cli/workflow.ts
git commit -m "refactor(workflow): extract runWorkflowCreate from create action"
```

- [ ] **Step 3: Write the failing test**

```ts
// workflow-after-create.test.ts — integration over the done action path.
// Setup: agentsDir with parent workflow md declaring
//   after: [{ workflow: child-wf, params: { story_id: story_id } }]
// and a child-wf.md with one intake stage. Parent created with
// params: { story_id: 'debo-design-system' }.
it('creates child workflows with JSONata-mapped params on final done', async () => {
  const done = await completeAllTasks(parent); // helper: workflowDone via CLI handler
  expect(done.next_workflows).toHaveLength(1);
  expect(done.next_workflows[0].workflow).toBe('child-wf');
  const child = readWorkflowFile(dataDir, done.next_workflows[0].name);
  expect(child.parent).toBe(parentName);
  expect(child.params?.story_id).toBe('debo-design-system');
  const parentMeta = readWorkflowFile(dataDir, parentName);
  expect(parentMeta.status).toBe('awaiting-after');
  expect(parentMeta.children).toEqual([{ name: done.next_workflows[0].name, workflow: 'child-wf' }]);
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `pnpm --filter storybook-addon-designbook test -- workflow-after-create`
Expected: FAIL.

- [ ] **Step 5: Implement**

In the `workflow done` CLI action (`src/cli/workflow.ts:506-584`):

1. Before calling `workflowDone`, load the definition and pass `after`:

```ts
const def = loadWorkflowDefinition(data.workflow /* workflow id from meta */, agentsDir);
const result = await workflowDone(config.data, opts.workflow, opts.task, loaded, {
  summary: opts.summary, data: dataPayload, config, after: def.after,
});
```

(The workflow id lives in the meta's `workflow` field; read the meta first or have `workflowDone` return it — whichever is cheaper at that call site. If the definition file cannot be found — e.g. test workspaces without skills — treat as `after: []` and log a warning; do not crash `done`.)

2. After `workflowDone` returns `awaitingAfter`:

```ts
if (result.awaitingAfter) {
  const next_workflows: Array<{ name: string; workflow: string }> = [];
  for (const decl of result.awaitingAfter) {
    const childParams: Record<string, unknown> = {};
    for (const [key, expr] of Object.entries(decl.params ?? {})) {
      childParams[key] = await jsonata(expr).evaluate(result.data.params ?? {});
    }
    const created = await runWorkflowCreate(
      { workflow: decl.workflow, parent: opts.workflow, params: childParams },
      config,
    );
    registerChild(config.data, opts.workflow, { name: created.name, workflow: decl.workflow });
    next_workflows.push({ name: created.name, workflow: decl.workflow });
  }
  console.log(`Workflow ${opts.workflow} awaiting after-workflows`);
  console.log(`NEXT_WORKFLOWS: ${JSON.stringify(next_workflows)}`);
  console.log('Dispatch ONE subagent per workflow: "execute workflow <name> to completion". The parent completes automatically when all children complete.');
}
```

3. `registerChild` in `src/workflow.ts` — load the parent's `changes/<name>/tasks.yml`, append to `children`, `writeWorkflowAtomic`.

- [ ] **Step 6: Run tests**

Run: `pnpm --filter storybook-addon-designbook test`
Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add -A packages/storybook-addon-designbook/src
git commit -m "feat(workflow): auto-create after: child workflows on final done"
```

### Task 5: Completion cascade — child archive flips the parent

**Files:**
- Modify: `src/workflow.ts` (`workflowDone` archive branch; new `cascadeParent` helper)
- Test: extend `src/cli/__tests__/workflow-after-create.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
it('archives the parent when the last child completes', async () => {
  // ... parent in awaiting-after with one created child (from Task 4 setup) ...
  await completeAllTasks(childName);
  const parentMeta = readArchivedWorkflowFile(dataDir, parentName);
  expect(parentMeta.status).toBe('completed');
});

it('keeps parent awaiting-after while any child is unfinished', async () => {
  // parent with two after declarations; complete only the first child
  expect(readWorkflowFile(dataDir, parentName).status).toBe('awaiting-after');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter storybook-addon-designbook test -- workflow-after-create`
Expected: new tests FAIL.

- [ ] **Step 3: Implement**

In `workflowDone`, after a successful `archiveWorkflow(dataDir, name, data)`:

```ts
if (data.parent) cascadeParent(dataDir, data.parent);
```

```ts
function cascadeParent(dataDir: string, parentName: string): void {
  const filePath = resolve(dataDir, 'workflows', 'changes', parentName, 'tasks.yml');
  if (!existsSync(filePath)) return; // parent already archived or gone
  const parent = parseYaml(readFileSync(filePath, 'utf-8')) as WorkflowFile;
  if (parent.status !== 'awaiting-after') return;
  const children = parent.children ?? [];
  const allArchived = children.every((c) =>
    existsSync(resolve(dataDir, 'workflows', 'archive', c.name, 'tasks.yml')),
  );
  if (!allArchived) return;
  appendChildResultSummary(dataDir, parent); // Task 6 below — no-op stub for now
  archiveWorkflow(dataDir, parentName, parent);
  if (parent.parent) cascadeParent(dataDir, parent.parent); // grandparents
}
```

Note: a child archived as `incomplete` (abandoned) also counts as "archived" here and unblocks the parent — but the parent's aggregated summary will show the missing result, and debo-test scores the absent metric as crash. Alternative (stricter: require `status === 'completed'`) would leave parents stuck forever after a child is abandoned; choose the lenient version.

- [ ] **Step 4: Run tests, then commit**

Run: `pnpm --filter storybook-addon-designbook test` → PASS.

```bash
git add -A packages/storybook-addon-designbook/src
git commit -m "feat(workflow): cascade parent completion when after-children archive"
```

### Task 6: Summary aggregation — child results under `after.<workflow>` + parent summary line

**Files:**
- Modify: `src/cli/workflow-summary.ts` (`readSummary`, `SummaryResult`)
- Modify: `src/workflow.ts` (`appendChildResultSummary`)
- Test: extend `src/cli/__tests__/workflow-summary.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
it('aggregates child results under after.<workflow>', () => {
  const { root, dataDir } = setup('after-agg');
  // parent archive meta with children: [{ name: 'design-verify-abc1', workflow: 'design-verify' }]
  writeArchiveWithChildren(dataDir, 'design-shell-xyz', [
    { name: 'design-verify-abc1', workflow: 'design-verify' },
  ]);
  // child archive with a task carrying result entry 'score-report'
  writeArchiveWithTaskResult(dataDir, 'design-verify-abc1', 'score-report', {
    first_shot: { score: 34 }, final: { score: 12 }, delta: 22,
  });
  const r = readSummary({ dataDir, workflowName: 'design-shell-xyz' });
  expect(r?.after?.['design-verify']?.['score-report']).toMatchObject({ delta: 22 });
  rmSync(root, { recursive: true });
});
```

(Write the two helpers next to the existing `writeArchive` helper; the task result shape is `tasks[n].result.<key>.value` — mirror what `workflowDone --data` persists; check a real archived tasks.yml from the existing test fixtures if unsure.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter storybook-addon-designbook test -- workflow-summary`
Expected: FAIL — `after` undefined.

- [ ] **Step 3: Implement**

In `SummaryResult`:

```ts
after?: Record<string, Record<string, unknown>>;
```

In `readSummary`, after building the base result:

```ts
const children = (tasksData as { children?: Array<{ name: string; workflow: string }> })?.children ?? [];
if (children.length > 0) {
  const after: Record<string, Record<string, unknown>> = {};
  for (const c of children) {
    const childPath = resolve(opts.dataDir, 'workflows', 'archive', c.name, 'tasks.yml');
    if (!existsSync(childPath)) continue;
    const child = parseYaml(readFileSync(childPath, 'utf-8')) as { tasks?: Array<{ result?: Record<string, { value?: unknown }> }> };
    const merged: Record<string, unknown> = {};
    for (const t of child.tasks ?? []) {
      for (const [key, entry] of Object.entries(t.result ?? {})) {
        if (entry?.value !== undefined) merged[key] = entry.value;
      }
    }
    after[c.workflow] = merged;
  }
  result.after = after;
}
```

`appendChildResultSummary` in `src/workflow.ts` (called by `cascadeParent` before archiving):

```ts
function appendChildResultSummary(dataDir: string, parent: WorkflowFile): void {
  const lines: string[] = [];
  for (const c of parent.children ?? []) {
    const p = resolve(dataDir, 'workflows', 'archive', c.name, 'tasks.yml');
    if (!existsSync(p)) continue;
    const child = parseYaml(readFileSync(p, 'utf-8')) as WorkflowFile;
    const report = findResultValue(child, 'score-report') as
      | { first_shot?: { score?: number }; final?: { score?: number }; delta?: number } | undefined;
    lines.push(report
      ? `${c.workflow}: first_shot ${report.first_shot?.score} → final ${report.final?.score} (Δ ${report.delta})`
      : `${c.workflow}: ${child.status ?? 'unknown'}`);
  }
  if (lines.length) parent.summary = lines.join(' | ');
}
```

(`findResultValue`: walk `child.tasks[].result` for the key, return `.value`. Note `archiveWorkflow` overwrites `wf.summary` from task titles — so either set the summary AFTER the title-join inside `archiveWorkflow` via an optional param, or have `archiveWorkflow` skip the title-join when `wf.summary` is already set by the cascade. Pick the optional-param variant: `archiveWorkflow(dataDir, name, wf, { summaryOverride?: string })`.) The WorkflowPanel already renders `wf.summary` (line 615) — no further UI work; this IS the "one summary line in the task panel" from the spec.

- [ ] **Step 4: Run tests, then commit**

Run: `pnpm --filter storybook-addon-designbook test` → PASS.

```bash
git add -A packages/storybook-addon-designbook/src
git commit -m "feat(workflow): aggregate after-child results in summary + parent summary line"
```

### Task 7: `workflow summary --metric <jsonata>`

**Files:**
- Modify: `src/cli/workflow-summary.ts`
- Test: extend `src/cli/__tests__/workflow-summary.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
it('evaluates a JSONata metric over the summary', async () => {
  // reuse the after-aggregation fixture from Task 6
  const r = readSummary({ dataDir, workflowName: 'design-shell-xyz' });
  const metric = await evaluateMetric(r!, 'after.`design-verify`.`score-report`.first_shot.score');
  expect(metric).toBe(34);
});

it('returns null for an unresolvable metric expression', async () => {
  const metric = await evaluateMetric(r!, 'after.`nope`.x');
  expect(metric).toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter storybook-addon-designbook test -- workflow-summary`
Expected: FAIL — `evaluateMetric` not exported.

- [ ] **Step 3: Implement**

```ts
import jsonata from 'jsonata';

export async function evaluateMetric(summary: SummaryResult, expression: string): Promise<number | null> {
  try {
    const v = await jsonata(expression).evaluate(summary);
    return typeof v === 'number' ? v : null;
  } catch {
    return null;
  }
}
```

Wire into the CLI command (same file, command registration ~line 107-127): add `--metric <expression>`; when given, print `"metric": <value|null>` as part of the JSON output and exit non-zero if the value is `null` (debo-test crash signal).

- [ ] **Step 4: Run tests, then commit**

Run: `pnpm --filter storybook-addon-designbook test` → PASS.

```bash
git add -A packages/storybook-addon-designbook/src
git commit -m "feat(workflow): summary --metric evaluates JSONata over aggregated summary"
```

### Task 8: Phase 1 gate

- [ ] **Step 1: Full check**

Run: `pnpm check`
Expected: typecheck, lint, test all PASS. Fix anything that fails (use `pnpm --filter storybook-addon-designbook lint:fix` for formatting).

- [ ] **Step 2: Commit any fixes**

```bash
git add -A && git commit -m "chore: phase 1 lint/type fixes"   # only if needed
```

---

# Phase 2 — Skills

> **Gate:** Load `designbook-skill-creator` + its rules (`rules/common-rules.md`, `rules/workflow-files.md`, `rules/task-files.md`, `rules/schema-files.md`) BEFORE touching any file in this phase. Tasks say WHAT, never HOW; rules have no own params; schemas live in schemas.yml, never inline.

### Task 9: `VerifyResult` + `ScoreReport` schemas

**Files:**
- Modify: `.agents/skills/designbook/design/schemas.yml`

- [ ] **Step 1: Copy the schema definitions**

Source of truth: `/home/cw/projects/designbook/.claude/worktrees/region-properties-resolver/.agents/skills/designbook/design/schemas.yml` — copy the complete `VerifyResult` and `ScoreReport` blocks. If that worktree is gone, the essential shape (recreate verbatim):

```yaml
ScoreReport:
  type: object
  title: Score Report
  description: >
    A design-verify run: first_shot (before any fix) and final (after the
    single fix pass), each a full VerifyResult. delta = first_shot.score
    − final.score (positive = improvement; lower score is better).
  required: [first_shot, final, delta]
  properties:
    first_shot: { $ref: "#/VerifyResult" }
    final:      { $ref: "#/VerifyResult" }
    delta:      { type: integer, examples: [11], description: first_shot.score − final.score. }
    tokens:
      type: object
      description: LLM tokens summed across capture + fix. Best-effort.
      properties: { input: { type: integer }, output: { type: integer } }
```

(`VerifyResult` is larger — score, avg/max_diff_percent, passed, total, issues by severity, per-check breakdown, tokens — copy it from the worktree; it exists there in full at lines ~90-125.)

- [ ] **Step 2: Validate + commit**

Run whatever schema validation the skill-creator rules prescribe (e.g. the validate CLI). Then:

```bash
git add .agents/skills/designbook/design/schemas.yml
git commit -m "feat(design): VerifyResult + ScoreReport schemas"
```

### Task 10: Merge `design-verify` into one workflow

**Files:**
- Rewrite: `.agents/skills/designbook/design/workflows/design-verify.md`
- Modify: `.agents/skills/designbook/design/tasks/capture-storybook.md` (trigger), `capture-reference.md` (check whether it triggers on `capture` too), `compare-screenshots.md` (trigger), `.agents/skills/designbook/design/tasks/outtake--design-verify.md`

- [ ] **Step 1: Rewrite the workflow definition**

`design-verify.md`:

```yaml
---
title: Design Verify
description: Visual testing — measure, fix once, re-measure against the design reference
params:
  story_id:
    type: string
    resolve: story_id
    sources: [scenes]
stages:
  reference:
    steps: [extract-reference]
  intake:
    steps: [intake]
  setup-compare:
    steps: [setup-compare]
  capture:
    steps: [capture]
  compare:
    steps: [compare]
  triage:
    steps: [triage]
  polish:
    steps: [polish]
  re-capture:
    steps: [re-capture]
  re-compare:
    steps: [re-compare]
  outtake:
    steps: [outtake]
engine: direct
before:
  - workflow: css-generate
    execute: always
---
```

Below the frontmatter, keep the stale-CSS rationale paragraph from the split branch's `verify-capture.md` (why `execute: always`, not `if-never-run`).

**Decision locked in:** distinct step names `re-capture`/`re-compare` (NOT repeating `capture`/`compare` in two stages) — the existing tasks gain extra trigger entries instead. This avoids any engine ambiguity about duplicate step names.

- [ ] **Step 2: Extend the task triggers**

In `capture-storybook.md` (and `capture-reference.md` IF its trigger lists `capture` — check first):

```yaml
trigger:
  steps: [capture, re-capture]
```

In `compare-screenshots.md`:

```yaml
trigger:
  steps: [compare, re-compare]
```

- [ ] **Step 3: Rewrite `outtake--design-verify.md`**

Content basis: the split-branch version (same path in the region-properties-resolver worktree). Changes vs. that version: `first_shot` and `final` are no longer passed in by an orchestrator — the task instructs reading the workflow's own results: the `compare` stage's verify result = `first_shot`, the `re-compare` stage's = `final`. Result schema stays:

```yaml
result:
  type: object
  required: [score-report]
  properties:
    score-report: { $ref: ../schemas.yml#/ScoreReport }
```

Body (WHAT-level): compute `delta = first_shot.score − final.score`; sum tokens per channel when present; submit via `workflow done --task <id> --data '{"score-report": {...}}'`; display the compact score block (first_shot / final / delta / passed / avg diff). Skip semantics: when the `compare` stage's score is already 0, triage/polish/re-capture/re-compare are skipped and `final = first_shot` — express this as a `when`/skip condition per the skill-creator workflow rules (the triage task should carry the condition, not prose in the workflow file).

- [ ] **Step 4: Confirm deletions are no-ops on this branch**

`verify-capture.md`, `verify-fix.md`, `orchestrate--design-verify.md` exist ONLY on the split branch — verify they don't exist here (`ls .agents/skills/designbook/design/workflows/`), nothing to delete. The split branch itself is disposed separately (out of scope).

- [ ] **Step 5: Commit**

```bash
git add .agents/skills/designbook/design
git commit -m "feat(design): merge verify into one workflow with re-measure stages"
```

### Task 11: `after:` declarations on the design workflows

**Files:**
- Modify: `.agents/skills/designbook/design/workflows/design-shell.md`, `design-screen.md`, `design-component.md`

- [ ] **Step 1: Replace the prose-driven after-hook**

In each of the three files, the frontmatter gets:

```yaml
after:
  - workflow: design-verify
    params:
      story_id: story_id
```

(`story_id` on the right side is the JSONata expression over the parent's params — all three workflows resolve a `story_id` param at create time, verify each file's `params:` block actually declares it; design-shell does.) Remove the "## Triggering design-verify" prose section if present (split branch had one in design-shell.md; this branch may not — check). `design-component.md` already has an `after:` block in some branches — make it match this exact shape.

- [ ] **Step 2: Commit**

```bash
git add .agents/skills/designbook/design/workflows
git commit -m "feat(design): declarative after: design-verify with param mapping"
```

### Task 12: debo-test — metric from case yaml

**Files:**
- Modify: `.agents/skills/designbook-test/workflows/research.md`, `.agents/skills/designbook-test/workflows/run.md`
- Check: `.agents/skills/designbook-test/SKILL.md` (whether case-yaml fields are documented there — if yes, document `metric`)

- [ ] **Step 1: research.md changes**

1. Inputs table, new row:

```
| `$METRIC` | `--metric <jsonata>`, default = case yaml `metric:` field, fallback `flowRate` |
```

2. Scoring steps (Iteration 0 and Loop step 5): the summary call becomes

```
npx storybook-addon-designbook workflow summary --workflow <id> --case <path> --metric "$METRIC" --json
```

and the score is the returned `metric` value (no longer hardcoded `.flowRate`).

3. `score-history.tsv` header becomes:

```
iter	hypothesis	score	flow_rate	first_shot	final	delta	decision
```

(`score` = decision metric; the other three from `after.design-verify.score-report` when present, else `—`.)

4. Decision step (Loop step 6): compare `metric` with best-so-far. **Direction:** for `first_shot.score` lower is better — the keep condition must respect metric direction. Add a `direction: min|max` companion field in the case yaml (default `max` for flowRate-style metrics); keep = `new better than best` per direction.

5. Crash definition, extend the table: parent workflow not archived (summary CLI returns non-zero / `metric: null`) → `crash` (existing retry semantics).

- [ ] **Step 2: run.md change**

After workflow completion (new step before the snapshot offer): run `workflow summary --workflow <id> --json` and display it, including the `after.*` block, so manual runs show what verify measured.

- [ ] **Step 3: Case yaml**

Document the two new optional fields where case-yaml fields are documented (SKILL.md or fixtures README — locate it):

```yaml
metric: after.`design-verify`.`score-report`.first_shot.score
direction: min
```

- [ ] **Step 4: Commit**

```bash
git add .agents/skills/designbook-test
git commit -m "feat(debo-test): JSONata metric from case yaml drives research scoring"
```

### Task 13: Review — debo-test run as subagent with full validation

The review is NOT a manual smoke test. Dispatch a subagent that runs `debo-test run` end-to-end and validates every artifact against an explicit checklist. The subagent MUST stop and escalate on any validation failure — never report done with unresolved errors.

- [ ] **Step 1: Dispatch the validation subagent**

Use the `Agent` tool (`subagent_type: "general-purpose"`). Prompt (replace `<case>` with an existing design-shell case from `fixtures/`):

```
Load the debo-test skill, then execute `debo-test run <suite> <case>` for a
design-shell case, answering "yes" to executing the prompt. The repo's
.agents/.claude are copied into the workspace by setup-workspace.sh, so the
new skill files under test are active.

After the run, validate EVERY item below from inside the workspace. For each
item record PASS/FAIL with evidence (file path + relevant excerpt). Do NOT
fix anything; do NOT mark items passed without reading the actual artifact.
If ANY item fails, stop and report the failure — never call the run done.

1. Workflow definition: `workflow list design-verify` (or loadWorkflowDefinition
   output) shows the merged single workflow — stages reference, intake,
   setup-compare, capture, compare, triage, polish, re-capture, re-compare,
   outtake; before: css-generate execute: always; no verify-capture/verify-fix
   definitions exist.
2. after: declaration: design-shell definition carries
   after: [{workflow: design-verify, params: {story_id: story_id}}].
3. Parent lifecycle: parent's final `workflow done` output contained
   NEXT_WORKFLOWS with the design-verify child; while the child ran,
   workflows/changes/<parent>/tasks.yml had status: awaiting-after and
   children: [{name, workflow: design-verify}].
4. Child meta: child tasks.yml has parent: <parent-name> and
   params.story_id resolved to the shell story.
5. Result schema: child's outtake task result contains a score-report that
   validates against ScoreReport (first_shot, final, delta all present;
   delta === first_shot.score − final.score; each VerifyResult has score,
   passed, total).
6. Cascade: after child completion the parent is in workflows/archive/ with
   status: completed and summary matching
   /design-verify: first_shot \d+ → final \d+ \(Δ -?\d+\)/.
7. Summary aggregation: `npx storybook-addon-designbook workflow summary
   --workflow <parent> --json` contains after.design-verify.score-report.
8. Metric: same command with
   --metric 'after.`design-verify`.`score-report`.first_shot.score'
   prints a numeric metric and exits 0; with a bogus expression
   (--metric 'after.`nope`.x') it prints metric: null and exits non-zero.
9. Panel: workflows panel data (parent archived tasks.yml summary field) holds
   the one-line result summary — the WorkflowPanel renders wf.summary, so the
   field IS the UI contract.

Return: a PASS/FAIL table for items 1-9 with evidence, plus the workspace
path and parent/child workflow names.
```

- [ ] **Step 2: Review the subagent's report**

All 9 PASS → phase complete. Any FAIL → fix in the main session (root cause, not symptom), re-dispatch the subagent for a fresh full run (workspaces are disposable; setup-workspace.sh rebuilds from scratch). Repeat until 9/9.

- [ ] **Step 3: Commit any fixes individually, then final `pnpm check`.**

---

## Self-review notes (done at plan time)

- Spec coverage: Part 1 items 1-8 → Tasks 1-7 + Task 2/6 (panel via status mapping + `wf.summary`); Part 2 items 1-5 → Tasks 9-11 (duplicate-step issue resolved by decision: distinct step names + extra triggers); Part 3 items 1-4 → Task 12; packaging/gates → ground rules + Tasks 8/13.
- Direction semantics (lower score better) surfaced during planning; added `direction: min|max` to Task 12 — spec didn't cover it.
- `archiveWorkflow` overwrites `summary` — handled explicitly in Task 6.
