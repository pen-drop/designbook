/**
 * Integration tests for schema composition through the full workflow lifecycle.
 *
 * Validates that `extends`, `provides`, and `constrains` from rules and blueprints
 * compose correctly through resolveAllStages -> workflowCreate -> workflowDone.
 *
 * Merge order (from computeMergedSchema):
 *   base schema -> blueprint extends -> rule extends -> blueprint provides -> rule provides -> rule constrains
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { dump as stringifyYaml } from 'js-yaml';
import { resolveAllStages, buildEnvMap, expandResultDeclarations, parseFrontmatter } from '../../workflow-resolve.js';
import type { ResolvedStep, ResolvedSteps } from '../../workflow-resolve.js';
import { workflowCreate, workflowDone, readWorkflow } from '../../workflow.js';
import type { WorkflowFile } from '../../workflow.js';
import type { DesignbookConfig } from '../../config.js';

// ── helpers ─────────────────────────────────────────────────────────────────

function makeTmpDir(): string {
  const dir = resolve(tmpdir(), `wf-schema-comp-${randomBytes(4).toString('hex')}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function writeMd(filePath: string, fm: Record<string, unknown>, body = ''): void {
  mkdirSync(resolve(filePath, '..'), { recursive: true });
  const content = `---\n${stringifyYaml(fm).trim()}\n---\n${body}`;
  writeFileSync(filePath, content);
}

function writeWorkflow(agentsDir: string, skill: string, id: string, fm: Record<string, unknown>): string {
  const filePath = resolve(agentsDir, 'skills', skill, 'workflows', `${id}.md`);
  writeMd(filePath, fm, `# ${id} workflow`);
  return filePath;
}

function writeTask(agentsDir: string, skill: string, name: string, fm: Record<string, unknown>, body = ''): string {
  const filePath = resolve(agentsDir, 'skills', skill, 'tasks', `${name}.md`);
  writeMd(filePath, fm, body || `# ${name} task`);
  return filePath;
}

function writeRule(agentsDir: string, skill: string, name: string, fm: Record<string, unknown>, body = ''): string {
  const filePath = resolve(agentsDir, 'skills', skill, 'rules', `${name}.md`);
  writeMd(filePath, fm, body || `# ${name} rule`);
  return filePath;
}

function writeBlueprint(
  agentsDir: string,
  skill: string,
  name: string,
  fm: Record<string, unknown>,
  body = '',
): string {
  const filePath = resolve(agentsDir, 'skills', skill, 'blueprints', `${name}.md`);
  writeMd(filePath, fm, body || `# ${name} blueprint`);
  return filePath;
}

// ── setup / teardown ────────────────────────────────────────────────────────

let tmpDir: string;
let agentsDir: string;

const baseConfig: DesignbookConfig = {
  data: '',
  technology: 'html',
  workspace: '',
  'designbook.home': '',
  'designbook.data': '',
};

beforeEach(() => {
  tmpDir = makeTmpDir();
  agentsDir = resolve(tmpDir, '.agents');
  const dist = resolve(tmpDir, 'dist');
  mkdirSync(dist, { recursive: true });

  baseConfig.data = dist;
  baseConfig.workspace = tmpDir;
  baseConfig['designbook.home'] = tmpDir;
  baseConfig['designbook.data'] = dist;
});

afterEach(() => {
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true });
});

// ── fixtures ────────────────────────────────────────────────────────────────

function setupSchemaCompositionFixtures(): { workflowPath: string } {
  // Workflow: test-compose with stages intake -> execute(create-thing)
  const workflowPath = writeWorkflow(agentsDir, 'test-compose', 'test-compose', {
    title: 'Test Compose',
    stages: {
      intake: {
        steps: ['intake'],
      },
      execute: {
        steps: ['create-thing'],
        each: 'items',
        domain: ['data-model'],
      },
    },
    engine: 'direct',
  });

  // Task: intake--test-compose
  writeTask(agentsDir, 'test-compose', 'intake--test-compose', {
    trigger: { steps: ['intake'] },
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

  // Task: create-thing
  writeTask(agentsDir, 'test-compose', 'create-thing', {
    trigger: { steps: ['create-thing'] },
    domain: ['data-model'],
    each: {
      items: { type: 'object' },
    },
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

  // Rule: extend-thing — adds extra property via extends
  writeRule(agentsDir, 'test-compose', 'extend-thing', {
    trigger: { domain: 'data-model' },
    extends: {
      thing: {
        properties: {
          extra: { type: 'number' },
        },
      },
    },
  });

  // Rule: constrain-thing — narrows enum via constrains
  writeRule(agentsDir, 'test-compose', 'constrain-thing', {
    trigger: { domain: 'data-model' },
    constrains: {
      thing: {
        properties: {
          name: { enum: ['b', 'c', 'd', 'e'] },
        },
      },
    },
  });

  // Blueprint: thing-bp — provides default value
  writeBlueprint(agentsDir, 'test-compose', 'thing-bp', {
    type: 'component',
    name: 'thing',
    trigger: { domain: 'data-model' },
    provides: {
      thing: {
        properties: {
          name: { default: 'untitled' },
        },
      },
    },
  });

  return { workflowPath };
}

// ── runWorkflow helper ──────────────────────────────────────────────────────

interface StepAction {
  done: string;
  data?: Record<string, unknown>;
}

interface RunWorkflowResult {
  resolved: ResolvedSteps;
  name: string;
  created: WorkflowFile;
  afterSteps: WorkflowFile[];
}

/**
 * Run a full workflow lifecycle:
 * 1. resolveAllStages
 * 2. Replicate CLI create logic (find first step, build first task with result, call workflowCreate)
 * 3. For each step action: call workflowDone
 * 4. Returns { resolved, name, created, afterSteps }
 */
async function runWorkflow(workflowPath: string, steps: StepAction[] = []): Promise<RunWorkflowResult> {
  const resolved = resolveAllStages(workflowPath, baseConfig, {}, agentsDir);

  // Find first stage with a resolved step (mirrors CLI logic)
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

  // Build result declarations from first task's frontmatter
  const envMap = buildEnvMap(baseConfig);
  let firstResult: Record<string, { path?: string; schema?: object; validators?: string[] }> | undefined;
  if (firstResolved) {
    const firstFm = parseFrontmatter(firstResolved.task_file);
    const resultDecl = firstFm?.result as Record<string, unknown> | undefined;
    firstResult = expandResultDeclarations(resultDecl, undefined, {}, envMap, undefined, true);
  }

  const title = resolved.title;
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

  const name = workflowCreate(
    baseConfig.data,
    'test-compose',
    title,
    firstTask,
    resolved.stages,
    undefined,
    resolved.step_resolved,
    resolved.engine,
    undefined,
    tmpDir,
    {},
    envMap,
  );

  // Read the created workflow
  const changesDir = resolve(baseConfig.data, 'workflows', 'changes', name);
  const tasksPath = resolve(changesDir, 'tasks.yml');
  const created = readWorkflow(tasksPath);

  // Execute step actions
  const afterSteps: WorkflowFile[] = [];
  for (const action of steps) {
    // Read the latest state: after previous steps or from initial create
    const current = afterSteps.length > 0 ? afterSteps[afterSteps.length - 1]! : created;
    const taskToComplete = current.tasks.find((t) => t.step === action.done && t.status === 'in-progress');

    if (!taskToComplete) {
      throw new Error(
        `No in-progress task found for step "${action.done}". Available: ${current.tasks
          .map((t) => `${t.step}(${t.status})`)
          .join(', ')}`,
      );
    }

    const taskId = taskToComplete.id;

    await workflowDone(baseConfig.data, name, taskId, undefined, {
      ...(action.data ? { data: action.data } : {}),
      config: baseConfig,
    });

    afterSteps.push(readWorkflow(tasksPath));
  }

  return { resolved, name, created, afterSteps };
}

// ── Test 1: resolveAllStages produces schema with definitions ───────────────

describe('resolveAllStages with schema composition', () => {
  it('produces schema.definitions from extends + provides + constrains', () => {
    const { workflowPath } = setupSchemaCompositionFixtures();
    const resolved = resolveAllStages(workflowPath, baseConfig, {}, agentsDir);

    // The create-thing step should have schema with definitions
    const createThingStep = resolved.step_resolved['create-thing'];
    expect(createThingStep).toBeDefined();
    expect(Array.isArray(createThingStep)).toBe(false);

    const step = createThingStep as ResolvedStep;
    expect(step.schema).toBeDefined();
    expect(step.schema!.definitions.thing).toBeDefined();

    const thingSchema = step.schema!.definitions.thing as Record<string, unknown>;
    const properties = thingSchema.properties as Record<string, Record<string, unknown>>;

    // extends added 'extra' property
    expect(properties.extra).toBeDefined();
    expect(properties.extra!.type).toBe('number');

    // provides set default on 'name'
    expect(properties.name).toBeDefined();
    expect(properties.name!.default).toBe('untitled');

    // constrains narrowed enum: base [a,b,c,d] intersect [b,c,d,e] = [b,c,d]
    expect(properties.name!.enum).toEqual(['b', 'c', 'd']);

    // Base type is preserved
    expect(properties.name!.type).toBe('string');

    // Rules and blueprints are populated
    expect(step.rules.some((r) => r.includes('extend-thing.md'))).toBe(true);
    expect(step.rules.some((r) => r.includes('constrain-thing.md'))).toBe(true);
    expect(step.blueprints.some((b) => b.includes('thing-bp.md'))).toBe(true);
  });

  it('intake step has no composed definitions', () => {
    const { workflowPath } = setupSchemaCompositionFixtures();
    const resolved = resolveAllStages(workflowPath, baseConfig, {}, agentsDir);

    const intakeStep = resolved.step_resolved['intake'];
    expect(intakeStep).toBeDefined();
    expect(Array.isArray(intakeStep)).toBe(false);

    const step = intakeStep as ResolvedStep;
    // Intake has result (items) so schema is present, but no composed definitions
    expect(step.schema).toBeDefined();
    expect(Object.keys(step.schema!.definitions)).toHaveLength(0);
  });
});

// ── Test 2: workflowCreate stores schema in stage_loaded ────────────────────

describe('workflowCreate with schema composition', () => {
  it('stores schema in stage_loaded', async () => {
    setupSchemaCompositionFixtures();

    const { created } = await runWorkflow(resolve(agentsDir, 'skills', 'test-compose', 'workflows', 'test-compose.md'));

    // Workflow is running with intake as current stage
    expect(created.status).toBe('running');
    expect(created.current_stage).toBe('intake');

    // stage_loaded should have create-thing with schema
    expect(created.stage_loaded).toBeDefined();
    expect(created.stage_loaded!['create-thing']).toBeDefined();

    const createThingLoaded = created.stage_loaded!['create-thing'] as {
      schema?: { definitions: Record<string, object> };
      rules: string[];
      blueprints: string[];
    };
    expect(createThingLoaded.schema).toBeDefined();
    expect(createThingLoaded.schema!.definitions.thing).toBeDefined();

    const thingSchema = createThingLoaded.schema!.definitions.thing as Record<string, unknown>;
    const properties = thingSchema.properties as Record<string, Record<string, unknown>>;

    // Verify composed schema in stored state
    expect(properties.name!.type).toBe('string');
    expect(properties.name!.enum).toEqual(['b', 'c', 'd']);
    expect(properties.name!.default).toBe('untitled');
    expect(properties.extra!.type).toBe('number');

    // Rules and blueprints are stored
    expect(createThingLoaded.rules.some((r) => r.includes('extend-thing'))).toBe(true);
    expect(createThingLoaded.rules.some((r) => r.includes('constrain-thing'))).toBe(true);
    expect(createThingLoaded.blueprints.some((b) => b.includes('thing-bp'))).toBe(true);

    // First task should be intake, in-progress, with result declarations
    const intakeTask = created.tasks[0]!;
    expect(intakeTask.step).toBe('intake');
    expect(intakeTask.status).toBe('in-progress');
    expect(intakeTask.result).toBeDefined();
    expect(intakeTask.result!.items).toBeDefined();
  });
});

// ── Test 3: full lifecycle ──────────────────────────────────────────────────

describe('full lifecycle with schema composition', () => {
  it('intake done populates scope and expands tasks with result schema', async () => {
    setupSchemaCompositionFixtures();
    const workflowPath = resolve(agentsDir, 'skills', 'test-compose', 'workflows', 'test-compose.md');

    const { afterSteps } = await runWorkflow(workflowPath, [
      {
        done: 'intake',
        data: { items: [{ name: 'alpha' }] },
      },
    ]);

    expect(afterSteps).toHaveLength(1);
    const afterIntake = afterSteps[0]!;

    // Current stage should advance to execute
    expect(afterIntake.current_stage).toBe('execute');

    // Scope should have items from intake result
    expect(afterIntake.scope).toBeDefined();
    expect(afterIntake.scope!.items).toBeDefined();
    expect(afterIntake.scope!.items).toEqual([{ name: 'alpha' }]);

    // Intake task should be done
    const intakeTask = afterIntake.tasks.find((t) => t.step === 'intake');
    expect(intakeTask).toBeDefined();
    expect(intakeTask!.status).toBe('done');

    // A create-thing task should now exist and be in-progress
    const createThingTask = afterIntake.tasks.find((t) => t.step === 'create-thing');
    expect(createThingTask).toBeDefined();
    expect(createThingTask!.status).toBe('in-progress');

    // Expanded task should have base result schema (from task frontmatter)
    expect(createThingTask!.result).toBeDefined();
    expect(createThingTask!.result!.thing).toBeDefined();
    expect(createThingTask!.result!.thing!.schema).toBeDefined();

    const thingResultSchema = createThingTask!.result!.thing!.schema as Record<string, unknown>;
    expect(thingResultSchema.type).toBe('object');

    // stage_loaded still has schema with definitions
    expect(afterIntake.stage_loaded).toBeDefined();
    const createThingLoaded = afterIntake.stage_loaded!['create-thing'] as {
      schema?: { definitions: Record<string, object> };
    };
    expect(createThingLoaded.schema).toBeDefined();
    expect(createThingLoaded.schema!.definitions.thing).toBeDefined();
  });

  it('intake done with multiple items expands one task per item', async () => {
    setupSchemaCompositionFixtures();
    const workflowPath = resolve(agentsDir, 'skills', 'test-compose', 'workflows', 'test-compose.md');

    const { afterSteps } = await runWorkflow(workflowPath, [
      {
        done: 'intake',
        data: { items: [{ name: 'alpha' }, { name: 'beta' }] },
      },
    ]);

    expect(afterSteps).toHaveLength(1);
    const afterIntake = afterSteps[0]!;

    // Two create-thing tasks should exist
    const createThingTasks = afterIntake.tasks.filter((t) => t.step === 'create-thing');
    expect(createThingTasks).toHaveLength(2);

    // First should be in-progress, second pending
    expect(createThingTasks[0]!.status).toBe('in-progress');
    expect(createThingTasks[1]!.status).toBe('pending');

    // Scope should have both items
    expect(afterIntake.scope!.items).toEqual([{ name: 'alpha' }, { name: 'beta' }]);
  });
});
