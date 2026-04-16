# Schema Composition Integration Tests — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integration tests validating the full workflow lifecycle output (tasks.yml) — specifically that `extends`, `provides`, and `constrains` from rules/blueprints compose correctly through `resolveAllStages` → `workflowCreate` → `workflowDone`.

**Architecture:** A single test file with builder helpers (writeWorkflow, writeTask, writeRule, writeBlueprint), a normalize() function for stripping volatile fields, and a runWorkflow() orchestrator. Tests set up minimal skill fixtures in temp dirs, run the real functions, and assert against handwritten expected partials via `toMatchObject`.

**Tech Stack:** Vitest, js-yaml, node:fs (temp dirs), existing workflow exports from `workflow.ts` and `workflow-resolve.ts`

---

### Task 1: Builder helpers and normalize()

**Files:**
- Create: `packages/storybook-addon-designbook/src/validators/__tests__/workflow-schema-composition.test.ts`

- [ ] **Step 1: Create test file with imports and builder helpers**

```typescript
/**
 * Integration tests for schema composition through the workflow lifecycle.
 *
 * Covers:
 * - resolveAllStages producing merged_schema from extends/provides/constrains
 * - workflowCreate storing merged_schema in stage_loaded
 * - workflowDone driving stage transitions with scope collection and task expansion
 *
 * Uses real temp directories and skill fixtures, no mocks.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { dump as stringifyYaml, load as parseYaml } from 'js-yaml';
import { resolveAllStages, buildEnvMap, expandResultDeclarations, parseFrontmatter, type ResolvedStep } from '../../workflow-resolve.js';
import { workflowCreate, workflowDone, readWorkflow, type WorkflowFile } from '../../workflow.js';
import type { DesignbookConfig } from '../../config.js';

// ── builder helpers ─────────────────────────────────────────────────────────

function makeTmpDir(): string {
  const dir = resolve(tmpdir(), `wf-schema-${randomBytes(4).toString('hex')}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function writeMd(path: string, fm: object, body = ''): string {
  mkdirSync(resolve(path, '..'), { recursive: true });
  const content = `---\n${stringifyYaml(fm).trimEnd()}\n---\n${body}`;
  writeFileSync(path, content);
  return path;
}

function writeWorkflow(agentsDir: string, skill: string, id: string, fm: object): string {
  return writeMd(resolve(agentsDir, 'skills', skill, 'workflows', `${id}.md`), fm);
}

function writeTask(agentsDir: string, skill: string, name: string, fm: object, body = ''): string {
  return writeMd(resolve(agentsDir, 'skills', skill, 'tasks', `${name}.md`), fm, body);
}

function writeRule(agentsDir: string, skill: string, name: string, fm: object, body = ''): string {
  return writeMd(resolve(agentsDir, 'skills', skill, 'rules', `${name}.md`), fm, body);
}

function writeBlueprint(agentsDir: string, skill: string, name: string, fm: object, body = ''): string {
  return writeMd(resolve(agentsDir, 'skills', skill, 'blueprints', `${name}.md`), fm, body);
}

// ── normalize ───────────────────────────────────────────────────────────────

const VOLATILE_KEYS = new Set(['started_at', 'completed_at', 'last_validated', 'workflow_id']);

function normalize(data: WorkflowFile, rootDir: string): object {
  return JSON.parse(JSON.stringify(data), (key, value) => {
    if (VOLATILE_KEYS.has(key)) return undefined;
    if (typeof value === 'string' && value.startsWith(rootDir + '/')) {
      return value.slice(rootDir.length + 1);
    }
    return value;
  });
}
```

- [ ] **Step 2: Run typecheck to verify imports compile**

Run: `cd /home/cw/projects/designbook && pnpm --filter storybook-addon-designbook exec tsc --noEmit 2>&1 | head -30`
Expected: no errors related to the new test file (other pre-existing errors are OK)

- [ ] **Step 3: Commit**

```bash
git add packages/storybook-addon-designbook/src/validators/__tests__/workflow-schema-composition.test.ts
git commit -m "test: add builder helpers and normalize for schema composition tests"
```

---

### Task 2: Fixture setup and config

**Files:**
- Modify: `packages/storybook-addon-designbook/src/validators/__tests__/workflow-schema-composition.test.ts`

- [ ] **Step 1: Add config, setup/teardown, and fixture builder**

Append after the `normalize` function:

```typescript
// ── config ──────────────────────────────────────────────────────────────────

const baseConfig: DesignbookConfig = {
  data: '', // set in beforeEach to tmpDir-based path
  technology: 'html',
  workspace: '',
  'designbook.home': '',
  'designbook.data': '',
};

// ── setup / teardown ────────────────────────────────────────────────────────

let tmpDir: string;
let agentsDir: string;
let dist: string;

beforeEach(() => {
  tmpDir = makeTmpDir();
  agentsDir = resolve(tmpDir, '.agents');
  dist = resolve(tmpDir, '.dist');
  mkdirSync(dist, { recursive: true });
  baseConfig.data = dist;
  baseConfig.workspace = tmpDir;
  baseConfig['designbook.home'] = tmpDir;
  baseConfig['designbook.data'] = dist;
});

afterEach(() => {
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true });
});

// ── fixture: schema composition scenario ────────────────────────────────────

function setupSchemaCompositionFixtures(): string {
  // Workflow: intake → execute(create-thing), direct engine
  const wfPath = writeWorkflow(agentsDir, 'test-skill', 'test-compose', {
    title: 'Test Composition',
    stages: {
      intake: { steps: ['intake'] },
      execute: { steps: ['create-thing'] },
    },
    engine: 'direct',
  });

  // Task: intake (data result returning items array)
  writeTask(agentsDir, 'test-skill', 'intake--test-compose', {
    when: { steps: ['intake'] },
    domain: ['data-model'],
    result: {
      type: 'object',
      required: ['items'],
      properties: {
        items: {
          type: 'array',
          items: { type: 'object' },
        },
      },
    },
  });

  // Task: create-thing (base result schema with name enum)
  writeTask(agentsDir, 'test-skill', 'create-thing', {
    when: { steps: ['create-thing'] },
    domain: ['data-model'],
    each: { items: { type: 'object' } },
    result: {
      type: 'object',
      required: ['thing'],
      properties: {
        thing: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', enum: ['a', 'b', 'c', 'd'] },
          },
        },
      },
    },
  });

  // Rule: extends — adds extra property
  writeRule(agentsDir, 'test-skill', 'extend-thing', {
    domain: 'data-model',
    extends: {
      thing: {
        properties: {
          extra: { type: 'number' },
        },
      },
    },
  }, '# Adds extra property to thing');

  // Rule: constrains — narrows name enum
  writeRule(agentsDir, 'test-skill', 'constrain-thing', {
    domain: 'data-model',
    constrains: {
      thing: {
        properties: {
          name: { enum: ['b', 'c', 'd', 'e'] },
        },
      },
    },
  }, '# Constrains name to b/c/d/e');

  // Blueprint: provides — sets name default
  writeBlueprint(agentsDir, 'test-skill', 'thing-bp', {
    type: 'component',
    name: 'thing',
    domain: 'data-model',
    provides: {
      thing: {
        properties: {
          name: { default: 'untitled' },
        },
      },
    },
  }, '# Sets default for name');

  return wfPath;
}
```

- [ ] **Step 2: Verify file is valid TypeScript**

Run: `cd /home/cw/projects/designbook && pnpm --filter storybook-addon-designbook exec tsc --noEmit 2>&1 | head -30`
Expected: no new errors

- [ ] **Step 3: Commit**

```bash
git add packages/storybook-addon-designbook/src/validators/__tests__/workflow-schema-composition.test.ts
git commit -m "test: add fixture setup for schema composition scenario"
```

---

### Task 3: Test 1 — resolveAllStages produces merged_schema

**Files:**
- Modify: `packages/storybook-addon-designbook/src/validators/__tests__/workflow-schema-composition.test.ts`

- [ ] **Step 1: Write the test**

Append after the fixture function:

```typescript
// ── Test 1: resolveAllStages ────────────────────────────────────────────────

describe('resolveAllStages with schema composition', () => {
  it('produces merged_schema from extends + provides + constrains', () => {
    const wfPath = setupSchemaCompositionFixtures();
    const resolved = resolveAllStages(wfPath, baseConfig, {}, agentsDir);

    // Step resolved should contain create-thing with merged_schema
    const createThingResolved = resolved.step_resolved['create-thing'] as ResolvedStep;
    expect(createThingResolved).toBeDefined();

    // Rules and blueprints matched
    expect(createThingResolved.rules).toEqual(
      expect.arrayContaining([
        expect.stringContaining('extend-thing.md'),
        expect.stringContaining('constrain-thing.md'),
      ]),
    );
    expect(createThingResolved.blueprints).toEqual(
      expect.arrayContaining([expect.stringContaining('thing-bp.md')]),
    );

    // merged_schema: extends added extra, provides set default, constrains narrowed enum
    expect(createThingResolved.merged_schema).toBeDefined();
    expect(createThingResolved.merged_schema!['thing']).toMatchObject({
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', enum: ['b', 'c', 'd'], default: 'untitled' },
        extra: { type: 'number' },
      },
    });
  });

  it('intake step has no merged_schema (no extensions)', () => {
    const wfPath = setupSchemaCompositionFixtures();
    const resolved = resolveAllStages(wfPath, baseConfig, {}, agentsDir);

    const intakeResolved = resolved.step_resolved['intake'] as ResolvedStep;
    expect(intakeResolved).toBeDefined();
    expect(intakeResolved.merged_schema).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test**

Run: `cd /home/cw/projects/designbook && pnpm --filter storybook-addon-designbook exec vitest run src/validators/__tests__/workflow-schema-composition.test.ts 2>&1`
Expected: 2 tests pass

- [ ] **Step 3: Commit**

```bash
git add packages/storybook-addon-designbook/src/validators/__tests__/workflow-schema-composition.test.ts
git commit -m "test: resolveAllStages produces merged_schema from extends/provides/constrains"
```

---

### Task 4: Test 2 — workflowCreate stores merged_schema in stage_loaded

**Files:**
- Modify: `packages/storybook-addon-designbook/src/validators/__tests__/workflow-schema-composition.test.ts`

- [ ] **Step 1: Add the runWorkflow helper and Test 2**

Add the `runWorkflow` helper and the create-focused test. Insert after the Test 1 describe block:

```typescript
// ── runWorkflow helper ──────────────────────────────────────────────────────

interface WorkflowStep {
  done: string;
  data?: Record<string, unknown>;
  summary?: string;
}

async function runWorkflow(opts: {
  wfPath: string;
  workflowId: string;
  params?: Record<string, unknown>;
  steps: WorkflowStep[];
}): Promise<{
  resolved: ReturnType<typeof resolveAllStages>;
  name: string;
  created: WorkflowFile;
  afterSteps: WorkflowFile[];
}> {
  const resolved = resolveAllStages(opts.wfPath, baseConfig, {}, agentsDir);
  const envMap = buildEnvMap(baseConfig);

  // Replicate what CLI workflow create does: find first step, build first task
  let firstStepName: string | undefined;
  let firstStageName: string | undefined;
  let firstResolved: ResolvedStep | undefined;
  if (resolved.stages) {
    for (const [stageName, stageDef] of Object.entries(resolved.stages)) {
      const step = (stageDef as { steps?: string[] }).steps?.[0];
      if (!step) continue;
      const raw = resolved.step_resolved[step];
      const res = raw && !Array.isArray(raw) ? raw : undefined;
      if (res) {
        firstStepName = step;
        firstStageName = stageName;
        firstResolved = res;
        break;
      }
    }
  }

  let firstResult: Record<string, { path?: string; schema?: object; validators?: string[] }> | undefined;
  if (firstResolved) {
    const fm = parseFrontmatter(firstResolved.task_file);
    const resultDecl = fm?.result as Record<string, unknown> | undefined;
    firstResult = expandResultDeclarations(resultDecl, undefined, opts.params ?? {}, envMap, undefined, true);
  }

  const firstTaskId = firstStepName ?? 'task-1';
  const firstTask = firstStepName && firstStageName && firstResolved
    ? [{
        id: firstTaskId,
        title: `${resolved.title}: ${firstStepName}`,
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
      }]
    : [];

  const name = workflowCreate(
    dist,
    opts.workflowId,
    resolved.title,
    firstTask,
    resolved.stages,
    undefined,
    resolved.step_resolved,
    resolved.engine,
    opts.params,
    tmpDir,
    undefined,
    envMap,
  );

  const tasksYmlPath = resolve(dist, 'workflows', 'changes', name, 'tasks.yml');
  const created = readWorkflow(tasksYmlPath);

  const afterSteps: WorkflowFile[] = [];
  for (const step of opts.steps) {
    // Resolve step name to actual task ID
    const currentData = afterSteps.length > 0 ? afterSteps[afterSteps.length - 1]! : created;
    let taskId = step.done;
    const matchByStep = currentData.tasks.find(
      (t) => t.step === step.done && (t.status === 'in-progress' || t.status === 'pending'),
    );
    if (matchByStep) taskId = matchByStep.id;

    await workflowDone(dist, name, taskId, undefined, {
      summary: step.summary,
      data: step.data,
      config: baseConfig,
    });
    afterSteps.push(readWorkflow(tasksYmlPath));
  }

  return { resolved, name, created, afterSteps };
}

// ── Test 2: workflowCreate ──────────────────────────────────────────────────

describe('workflowCreate with schema composition', () => {
  it('stores merged_schema in stage_loaded', async () => {
    const wfPath = setupSchemaCompositionFixtures();

    const { created } = await runWorkflow({
      wfPath,
      workflowId: 'test-compose',
      steps: [],
    });

    const normalized = normalize(created, tmpDir) as Record<string, unknown>;

    expect(normalized).toMatchObject({
      status: 'running',
      current_stage: 'intake',
    });

    // stage_loaded has merged_schema for create-thing
    const stageLoaded = normalized['stage_loaded'] as Record<string, unknown>;
    expect(stageLoaded).toBeDefined();
    expect(stageLoaded['create-thing']).toMatchObject({
      rules: expect.arrayContaining([
        expect.stringContaining('extend-thing.md'),
        expect.stringContaining('constrain-thing.md'),
      ]),
      blueprints: expect.arrayContaining([
        expect.stringContaining('thing-bp.md'),
      ]),
      merged_schema: {
        thing: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', enum: ['b', 'c', 'd'], default: 'untitled' },
            extra: { type: 'number' },
          },
        },
      },
    });

    // First task is intake, in-progress, with result declarations
    const tasks = (normalized as { tasks: Array<Record<string, unknown>> }).tasks;
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({
      step: 'intake',
      status: 'in-progress',
      result: {
        items: {
          schema: expect.objectContaining({
            type: 'array',
          }),
        },
      },
    });
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `cd /home/cw/projects/designbook && pnpm --filter storybook-addon-designbook exec vitest run src/validators/__tests__/workflow-schema-composition.test.ts 2>&1`
Expected: 3 tests pass (2 from Test 1, 1 from Test 2)

- [ ] **Step 3: Commit**

```bash
git add packages/storybook-addon-designbook/src/validators/__tests__/workflow-schema-composition.test.ts
git commit -m "test: workflowCreate stores merged_schema in stage_loaded"
```

---

### Task 5: Test 3 — full lifecycle with intake done

**Files:**
- Modify: `packages/storybook-addon-designbook/src/validators/__tests__/workflow-schema-composition.test.ts`

- [ ] **Step 1: Write the lifecycle test**

Append after the Test 2 describe block:

```typescript
// ── Test 3: full lifecycle ──────────────────────────────────────────────────

describe('full lifecycle with schema composition', () => {
  it('intake done populates scope and expands tasks with result schema', async () => {
    const wfPath = setupSchemaCompositionFixtures();

    const { created, afterSteps } = await runWorkflow({
      wfPath,
      workflowId: 'test-compose',
      steps: [
        { done: 'intake', data: { items: [{ name: 'alpha' }] } },
      ],
    });

    // Sanity: created state has intake task
    expect(created.tasks).toHaveLength(1);
    expect(created.tasks[0]!.step).toBe('intake');

    // After intake done
    const afterIntake = normalize(afterSteps[0]!, tmpDir) as Record<string, unknown>;

    expect(afterIntake).toMatchObject({
      status: 'running',
      current_stage: 'execute',
      scope: {
        items: [{ name: 'alpha' }],
      },
    });

    // Tasks: intake done + expanded create-thing in-progress
    const tasks = (afterIntake as { tasks: Array<Record<string, unknown>> }).tasks;
    const intakeTask = tasks.find((t) => t['step'] === 'intake');
    const createThingTask = tasks.find((t) => t['step'] === 'create-thing');

    expect(intakeTask).toMatchObject({ status: 'done' });
    expect(createThingTask).toBeDefined();
    expect(createThingTask).toMatchObject({
      step: 'create-thing',
      status: 'in-progress',
    });

    // Expanded task has base result schema (from task frontmatter, not merged)
    expect(createThingTask!['result']).toMatchObject({
      thing: {
        schema: expect.objectContaining({
          type: 'object',
          required: ['name'],
          properties: expect.objectContaining({
            name: expect.objectContaining({ type: 'string' }),
          }),
        }),
      },
    });

    // stage_loaded still carries merged_schema
    const stageLoaded = afterIntake['stage_loaded'] as Record<string, unknown>;
    expect(stageLoaded['create-thing']).toMatchObject({
      merged_schema: {
        thing: {
          properties: {
            name: { type: 'string', enum: ['b', 'c', 'd'], default: 'untitled' },
            extra: { type: 'number' },
          },
        },
      },
    });
  });

  it('intake done with multiple items expands one task per item', async () => {
    const wfPath = setupSchemaCompositionFixtures();

    const { afterSteps } = await runWorkflow({
      wfPath,
      workflowId: 'test-compose',
      steps: [
        { done: 'intake', data: { items: [{ name: 'alpha' }, { name: 'beta' }] } },
      ],
    });

    const afterIntake = normalize(afterSteps[0]!, tmpDir) as Record<string, unknown>;
    const tasks = (afterIntake as { tasks: Array<Record<string, unknown>> }).tasks;

    // intake (done) + 2 create-thing tasks (first in-progress, second pending)
    const createThingTasks = tasks.filter((t) => t['step'] === 'create-thing');
    expect(createThingTasks).toHaveLength(2);
    expect(createThingTasks[0]).toMatchObject({ status: 'in-progress' });
    expect(createThingTasks[1]).toMatchObject({ status: 'pending' });

    // Scope has both items
    expect(afterIntake).toMatchObject({
      scope: {
        items: [{ name: 'alpha' }, { name: 'beta' }],
      },
    });
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `cd /home/cw/projects/designbook && pnpm --filter storybook-addon-designbook exec vitest run src/validators/__tests__/workflow-schema-composition.test.ts 2>&1`
Expected: 5 tests pass

- [ ] **Step 3: Commit**

```bash
git add packages/storybook-addon-designbook/src/validators/__tests__/workflow-schema-composition.test.ts
git commit -m "test: full lifecycle — intake done expands tasks with schema composition"
```

---

### Task 6: Run full check and fix any issues

**Files:**
- Possibly modify: `packages/storybook-addon-designbook/src/validators/__tests__/workflow-schema-composition.test.ts`

- [ ] **Step 1: Run typecheck**

Run: `cd /home/cw/projects/designbook && pnpm --filter storybook-addon-designbook exec tsc --noEmit 2>&1 | head -40`
Expected: no errors in the test file

- [ ] **Step 2: Run lint**

Run: `cd /home/cw/projects/designbook && pnpm --filter storybook-addon-designbook lint 2>&1 | tail -20`
Expected: no lint errors in the test file (fix any with `lint:fix` if needed)

- [ ] **Step 3: Run full test suite to check for regressions**

Run: `cd /home/cw/projects/designbook && pnpm --filter storybook-addon-designbook test 2>&1 | tail -30`
Expected: all tests pass including the new ones

- [ ] **Step 4: Commit any fixes**

```bash
git add packages/storybook-addon-designbook/src/validators/__tests__/workflow-schema-composition.test.ts
git commit -m "test: fix lint/type issues in schema composition tests"
```
