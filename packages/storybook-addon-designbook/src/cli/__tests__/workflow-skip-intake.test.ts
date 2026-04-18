/**
 * Integration test: when a caller passes a non-empty `components` param to
 * design-component, the CLI seeds `scope.components`, skips the intake stage,
 * and pre-expands the component stage with one task per component.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { dump as stringifyYaml, load as parseYaml } from 'js-yaml';
import { resolveAllStages, buildEnvMap } from '../../workflow-resolve.js';
import { workflowCreate, expandTasksFromParams, type WorkflowFile } from '../../workflow.js';
import type { DesignbookConfig } from '../../config.js';

function makeTmpDir(): string {
  const dir = resolve(tmpdir(), `wf-skip-intake-${randomBytes(4).toString('hex')}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function writeMd(filePath: string, fm: Record<string, unknown>, body = ''): void {
  mkdirSync(resolve(filePath, '..'), { recursive: true });
  const content = `---\n${stringifyYaml(fm).trim()}\n---\n${body}`;
  writeFileSync(filePath, content);
}

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

describe('workflow create: design-component intake skip', () => {
  it('seeds scope and pre-expands component-stage tasks when `components` param is provided', async () => {
    const skill = 'design-component-skip';

    // Schemas: minimal Component definition
    mkdirSync(resolve(agentsDir, 'skills', skill), { recursive: true });
    writeFileSync(
      resolve(agentsDir, 'skills', skill, 'schemas.yml'),
      stringifyYaml({
        Component: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' }, title: { type: 'string' } },
        },
      }),
    );

    // Workflow: two stages — intake (skipped) and component (expanded from scope)
    writeMd(
      resolve(agentsDir, 'skills', skill, 'workflows', 'design-component.md'),
      {
        title: 'Design Component',
        params: {
          components: {
            type: 'array',
            items: { $ref: '../schemas.yml#/Component' },
          },
        },
        stages: {
          intake: { steps: ['intake'] },
          component: { steps: ['create-component'] },
        },
        engine: 'direct',
      },
      '# design-component',
    );

    // Intake task — declares `components` as data result
    writeMd(
      resolve(agentsDir, 'skills', skill, 'tasks', 'intake.md'),
      {
        trigger: { steps: ['intake'] },
        result: {
          type: 'object',
          required: ['components'],
          properties: {
            components: {
              type: 'array',
              items: { $ref: '../schemas.yml#/Component' },
              submission: 'data',
            },
          },
        },
      },
      '# intake',
    );

    // create-component task with task-level each over `components`
    writeMd(
      resolve(agentsDir, 'skills', skill, 'tasks', 'create-component.md'),
      {
        trigger: { steps: ['create-component'] },
        each: {
          component: {
            expr: 'components',
            schema: { $ref: '../schemas.yml#/Component' },
          },
        },
      },
      '# create-component',
    );

    // ── Resolve stages
    const workflowPath = resolve(agentsDir, 'skills', skill, 'workflows', 'design-component.md');
    const resolved = await resolveAllStages(workflowPath, baseConfig, {}, agentsDir);

    // Mirror CLI skip-intake path: pre-expand component stage from initialScope
    const initialParams: Record<string, unknown> = {
      components: [
        { id: 'avatar', title: 'Avatar' },
        { id: 'badge', title: 'Badge' },
      ],
    };
    const initialScope = { components: initialParams.components };
    const envMap = buildEnvMap(baseConfig);

    const componentStageDef = resolved.stages!.component!;
    const expanded = await expandTasksFromParams(
      resolved.step_resolved,
      { component: componentStageDef },
      initialParams,
      [],
      envMap,
      initialScope,
      baseConfig,
    );
    expect(expanded.length).toBe(2);
    expect(expanded.every((t) => t.stage === 'component')).toBe(true);
    expect(expanded.every((t) => t.step === 'create-component')).toBe(true);

    const firstTask = expanded.map((t) => ({
      id: t.id,
      title: t.title,
      type: t.type,
      step: t.step,
      stage: t.stage,
      files: t.files,
      ...(t.result ? { result: t.result } : {}),
      task_file: t.task_file,
      rules: t.rules,
      blueprints: t.blueprints,
      config_rules: t.config_rules,
      config_instructions: t.config_instructions,
    }));

    const name = workflowCreate(
      baseConfig.data,
      'design-component',
      resolved.title,
      firstTask,
      resolved.stages,
      undefined,
      resolved.step_resolved,
      resolved.engine,
      initialParams,
      tmpDir,
      {},
      envMap,
      initialScope,
    );

    // ── Assert: tasks.yml shape
    const tasksYml = resolve(baseConfig.data, 'workflows', 'changes', name, 'tasks.yml');
    expect(existsSync(tasksYml)).toBe(true);
    const file = parseYaml(readFileSync(tasksYml, 'utf-8')) as WorkflowFile;

    // current_stage = 'component' (NOT 'intake')
    expect(file.current_stage).toBe('component');

    // Scope is seeded with components
    expect(file.scope).toBeDefined();
    expect((file.scope as Record<string, unknown>).components).toEqual(initialParams.components);

    // Two tasks, both in the component stage, none in intake
    expect(file.tasks.length).toBe(2);
    expect(file.tasks.every((t) => t.stage === 'component')).toBe(true);
    expect(file.tasks.some((t) => t.stage === 'intake')).toBe(false);

    // First task is in-progress (workflowCreate marks tasks[0] as in-progress)
    expect(file.tasks[0]!.status).toBe('in-progress');
    expect(file.tasks[1]!.status).toBe('pending');
  });

  it('keeps the default first task when `components` param is absent', async () => {
    const skill = 'design-component-default';

    mkdirSync(resolve(agentsDir, 'skills', skill), { recursive: true });
    writeFileSync(
      resolve(agentsDir, 'skills', skill, 'schemas.yml'),
      stringifyYaml({
        Component: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
      }),
    );

    writeMd(
      resolve(agentsDir, 'skills', skill, 'workflows', 'design-component.md'),
      {
        title: 'Design Component',
        params: {
          components: {
            type: 'array',
            items: { $ref: '../schemas.yml#/Component' },
          },
        },
        stages: {
          intake: { steps: ['intake'] },
          component: { steps: ['create-component'] },
        },
        engine: 'direct',
      },
      '# design-component',
    );

    writeMd(
      resolve(agentsDir, 'skills', skill, 'tasks', 'intake.md'),
      {
        trigger: { steps: ['intake'] },
        result: {
          type: 'object',
          required: ['components'],
          properties: {
            components: {
              type: 'array',
              items: { $ref: '../schemas.yml#/Component' },
              submission: 'data',
            },
          },
        },
      },
      '# intake',
    );

    writeMd(
      resolve(agentsDir, 'skills', skill, 'tasks', 'create-component.md'),
      {
        trigger: { steps: ['create-component'] },
        each: { component: { expr: 'components' } },
      },
      '# create-component',
    );

    const workflowPath = resolve(agentsDir, 'skills', skill, 'workflows', 'design-component.md');
    const resolved = await resolveAllStages(workflowPath, baseConfig, {}, agentsDir);
    const envMap = buildEnvMap(baseConfig);

    const firstStepName = 'intake';
    const firstResolved = resolved.step_resolved[firstStepName]!;
    const firstResolvedSingle = Array.isArray(firstResolved) ? firstResolved[0]! : firstResolved;

    const name = workflowCreate(
      baseConfig.data,
      'design-component',
      resolved.title,
      [
        {
          id: firstStepName,
          title: `${resolved.title}: ${firstStepName}`,
          type: 'data',
          step: firstStepName,
          stage: 'intake',
          files: [],
          task_file: firstResolvedSingle.task_file,
          rules: firstResolvedSingle.rules,
          blueprints: firstResolvedSingle.blueprints,
          config_rules: firstResolvedSingle.config_rules,
          config_instructions: firstResolvedSingle.config_instructions,
        },
      ],
      resolved.stages,
      undefined,
      resolved.step_resolved,
      resolved.engine,
      undefined,
      tmpDir,
      {},
      envMap,
    );

    const tasksYml = resolve(baseConfig.data, 'workflows', 'changes', name, 'tasks.yml');
    const file = parseYaml(readFileSync(tasksYml, 'utf-8')) as WorkflowFile;

    expect(file.current_stage).toBe('intake');
    expect(file.scope).toBeUndefined();
    expect(file.tasks.length).toBe(1);
    expect(file.tasks[0]!.stage).toBe('intake');
    expect(file.tasks[0]!.step).toBe('intake');
  });
});
