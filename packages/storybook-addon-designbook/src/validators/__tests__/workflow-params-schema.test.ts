/**
 * Integration tests for JSON Schema params migration.
 *
 * Covers:
 * - resolveAllStages rejecting old-format params (null, array, bare object, scalar)
 * - resolveAllStages building correct expected_params from JSON Schema
 * - expandTasksFromParams applying JSON Schema defaults and required validation
 * - Full workflow round-trip with JSON Schema params
 *
 * Uses real temp directories and task files, no mocks.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { resolveAllStages, type ResolvedStep } from '../../workflow-resolve.js';
import { expandTasksFromParams } from '../../workflow.js';
import type { DesignbookConfig } from '../../config.js';
import type { StageDefinition } from '../../workflow-types.js';

// ── helpers ─────────────────────────────────────────────────────────────────

function makeTmpDir(): string {
  const dir = resolve(tmpdir(), `wf-params-${randomBytes(4).toString('hex')}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function writeWorkflow(dir: string, frontmatter: string): string {
  const wfDir = resolve(dir, 'workflows');
  mkdirSync(wfDir, { recursive: true });
  const path = resolve(wfDir, 'test.md');
  writeFileSync(path, `---\n${frontmatter}\n---\n# Test Workflow`);
  return path;
}

function writeTask(agentsDir: string, skillName: string, taskName: string, frontmatter: string, body = ''): string {
  const dir = resolve(agentsDir, 'skills', skillName, 'tasks');
  mkdirSync(dir, { recursive: true });
  const path = resolve(dir, `${taskName}.md`);
  writeFileSync(path, `---\n${frontmatter}\n---\n${body}`);
  return path;
}

const baseConfig: DesignbookConfig = {
  data: '/test/dist',
  technology: 'drupal',
  backend: 'drupal',
  'frameworks.component': 'sdc',
  'frameworks.css': 'tailwind',
  workspace: '/test',
  'designbook.home': '/test/theme',
  'designbook.data': '/test/dist',
  'css.app': '/test/css/app.src.css',
};

// ── setup / teardown ────────────────────────────────────────────────────────

let tmpDir: string;

beforeEach(() => {
  tmpDir = makeTmpDir();
});

afterEach(() => {
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true });
});

// ── resolveAllStages: old-format rejection ──────────────────────────────────

describe('resolveAllStages rejects old-format params in properties', () => {
  function setupAndResolve(propertyLine: string): () => Promise<unknown> {
    const agentsDir = resolve(tmpDir, '.agents');
    writeTask(
      agentsDir,
      'test-skill',
      'do-thing',
      ['trigger:', '  steps: [do-thing]', 'params:', '  type: object', '  properties:', `    ${propertyLine}`].join(
        '\n',
      ),
    );
    const wfPath = writeWorkflow(tmpDir, 'title: Test\nstages:\n  execute:\n    steps: [do-thing]');
    return async () => resolveAllStages(wfPath, baseConfig, {}, agentsDir);
  }

  it('rejects null param (old required format)', async () => {
    const fn = setupAndResolve('name: ~');
    await expect(fn).rejects.toThrow(/Invalid param "name".*got null/);
  });

  it('rejects bare array param (old optional format)', async () => {
    const fn = setupAndResolve('items: []');
    await expect(fn).rejects.toThrow(/Invalid param "items".*got array/);
  });

  it('rejects bare object without type', async () => {
    const fn = setupAndResolve('data: { foo: bar }');
    await expect(fn).rejects.toThrow(/Invalid param "data".*got object without "type"/);
  });

  it('rejects string scalar', async () => {
    const fn = setupAndResolve('mode: fast');
    await expect(fn).rejects.toThrow(/Invalid param "mode".*got string/);
  });

  it('rejects number scalar', async () => {
    const fn = setupAndResolve('count: 5');
    await expect(fn).rejects.toThrow(/Invalid param "count".*got number/);
  });

  it('rejects boolean scalar', async () => {
    const fn = setupAndResolve('enabled: true');
    await expect(fn).rejects.toThrow(/Invalid param "enabled".*got boolean/);
  });

  it('rejects mixed params (first invalid triggers error)', async () => {
    const agentsDir = resolve(tmpDir, '.agents');
    writeTask(
      agentsDir,
      'test-skill',
      'do-thing',
      [
        'trigger:',
        '  steps: [do-thing]',
        'params:',
        '  type: object',
        '  properties:',
        '    valid_param: { type: string }',
        '    bad_param: ~',
      ].join('\n'),
    );
    const wfPath = writeWorkflow(tmpDir, 'title: Test\nstages:\n  execute:\n    steps: [do-thing]');
    await expect(async () => resolveAllStages(wfPath, baseConfig, {}, agentsDir)).rejects.toThrow(
      /Invalid param "bad_param"/,
    );
  });
});

// ── resolveAllStages: expected_params from JSON Schema ──────────────────────

describe('resolveAllStages builds correct expected_params', () => {
  it('marks param without default as required', async () => {
    const agentsDir = resolve(tmpDir, '.agents');
    writeTask(
      agentsDir,
      'test-skill',
      'do-thing',
      [
        'trigger:',
        '  steps: [do-thing]',
        'params:',
        '  type: object',
        '  required: [product_name]',
        '  properties:',
        '    product_name: { type: string }',
      ].join('\n'),
    );
    const wfPath = writeWorkflow(tmpDir, 'title: Test\nstages:\n  execute:\n    steps: [do-thing]');
    const result = await resolveAllStages(wfPath, baseConfig, {}, agentsDir);

    expect(result.expected_params.product_name).toBeDefined();
    expect(result.expected_params.product_name!.required).toBe(true);
    expect(result.expected_params.product_name!.default).toBeUndefined();
  });

  it('marks param with default as optional and stores default', async () => {
    const agentsDir = resolve(tmpDir, '.agents');
    writeTask(
      agentsDir,
      'test-skill',
      'do-thing',
      [
        'trigger:',
        '  steps: [do-thing]',
        'params:',
        '  type: object',
        '  properties:',
        '    items: { type: array, default: [] }',
      ].join('\n'),
    );
    const wfPath = writeWorkflow(tmpDir, 'title: Test\nstages:\n  execute:\n    steps: [do-thing]');
    const result = await resolveAllStages(wfPath, baseConfig, {}, agentsDir);

    expect(result.expected_params.items).toBeDefined();
    expect(result.expected_params.items!.required).toBe(false);
    expect(result.expected_params.items!.default).toEqual([]);
  });

  it('handles default: null as optional', async () => {
    const agentsDir = resolve(tmpDir, '.agents');
    writeTask(
      agentsDir,
      'test-skill',
      'do-thing',
      [
        'trigger:',
        '  steps: [do-thing]',
        'params:',
        '  type: object',
        '  properties:',
        '    ref:',
        '      type: object',
        '      default: null',
        '      properties:',
        '        url: { type: string }',
      ].join('\n'),
    );
    const wfPath = writeWorkflow(tmpDir, 'title: Test\nstages:\n  execute:\n    steps: [do-thing]');
    const result = await resolveAllStages(wfPath, baseConfig, {}, agentsDir);

    expect(result.expected_params.ref).toBeDefined();
    expect(result.expected_params.ref!.required).toBe(false);
    expect(result.expected_params.ref!.default).toBeNull();
  });

  it('handles default: {} as optional with empty object default', async () => {
    const agentsDir = resolve(tmpDir, '.agents');
    writeTask(
      agentsDir,
      'test-skill',
      'do-thing',
      [
        'trigger:',
        '  steps: [do-thing]',
        'params:',
        '  type: object',
        '  properties:',
        '    config: { type: object, default: {} }',
      ].join('\n'),
    );
    const wfPath = writeWorkflow(tmpDir, 'title: Test\nstages:\n  execute:\n    steps: [do-thing]');
    const result = await resolveAllStages(wfPath, baseConfig, {}, agentsDir);

    expect(result.expected_params.config!.required).toBe(false);
    expect(result.expected_params.config!.default).toEqual({});
  });

  it('aggregates params from multiple steps', async () => {
    const agentsDir = resolve(tmpDir, '.agents');
    writeTask(
      agentsDir,
      'test-skill',
      'step-a',
      [
        'trigger:',
        '  steps: [step-a]',
        'params:',
        '  type: object',
        '  required: [name]',
        '  properties:',
        '    name: { type: string }',
      ].join('\n'),
    );
    writeTask(
      agentsDir,
      'test-skill-b',
      'step-b',
      [
        'trigger:',
        '  steps: [step-b]',
        'params:',
        '  type: object',
        '  required: [mode]',
        '  properties:',
        '    items: { type: array, default: [] }',
        '    mode: { type: string }',
      ].join('\n'),
    );
    const wfPath = writeWorkflow(tmpDir, 'title: Test\nstages:\n  execute:\n    steps: [step-a, step-b]');
    const result = await resolveAllStages(wfPath, baseConfig, {}, agentsDir);

    expect(Object.keys(result.expected_params)).toHaveLength(3);
    expect(result.expected_params.name!.required).toBe(true);
    expect(result.expected_params.items!.required).toBe(false);
    expect(result.expected_params.mode!.required).toBe(true);
  });

  it('if any step marks a param required, it stays required', async () => {
    const agentsDir = resolve(tmpDir, '.agents');
    // step-a declares shared as optional (has default)
    writeTask(
      agentsDir,
      'skill-a',
      'step-a',
      [
        'trigger:',
        '  steps: [step-a]',
        'params:',
        '  type: object',
        '  properties:',
        '    shared: { type: string, default: "fallback" }',
      ].join('\n'),
    );
    // step-b declares same param as required (no default)
    writeTask(
      agentsDir,
      'skill-b',
      'step-b',
      [
        'trigger:',
        '  steps: [step-b]',
        'params:',
        '  type: object',
        '  required: [shared]',
        '  properties:',
        '    shared: { type: string }',
      ].join('\n'),
    );
    const wfPath = writeWorkflow(tmpDir, 'title: Test\nstages:\n  execute:\n    steps: [step-a, step-b]');
    const result = await resolveAllStages(wfPath, baseConfig, {}, agentsDir);

    expect(result.expected_params.shared!.required).toBe(true);
  });

  it('records from_step for each param', async () => {
    const agentsDir = resolve(tmpDir, '.agents');
    writeTask(
      agentsDir,
      'test-skill',
      'create-vision',
      [
        'trigger:',
        '  steps: [create-vision]',
        'params:',
        '  type: object',
        '  required: [product_name]',
        '  properties:',
        '    product_name: { type: string }',
        '    features: { type: array, default: [] }',
      ].join('\n'),
    );
    const wfPath = writeWorkflow(tmpDir, 'title: Test\nstages:\n  execute:\n    steps: [create-vision]');
    const result = await resolveAllStages(wfPath, baseConfig, {}, agentsDir);

    expect(result.expected_params.product_name!.from_step).toBe('create-vision');
    expect(result.expected_params.features!.from_step).toBe('create-vision');
  });

  it('complex param with properties parsed correctly', async () => {
    const agentsDir = resolve(tmpDir, '.agents');
    writeTask(
      agentsDir,
      'test-skill',
      'do-thing',
      [
        'trigger:',
        '  steps: [do-thing]',
        'params:',
        '  type: object',
        '  properties:',
        '    design_reference:',
        '      type: object',
        '      default: null',
        '      properties:',
        '        type: { type: string }',
        '        url: { type: string }',
        '        label: { type: string }',
      ].join('\n'),
    );
    const wfPath = writeWorkflow(tmpDir, 'title: Test\nstages:\n  execute:\n    steps: [do-thing]');
    const result = await resolveAllStages(wfPath, baseConfig, {}, agentsDir);

    expect(result.expected_params.design_reference!.required).toBe(false);
    expect(result.expected_params.design_reference!.default).toBeNull();
  });

  it('integer type is valid JSON Schema', async () => {
    const agentsDir = resolve(tmpDir, '.agents');
    writeTask(
      agentsDir,
      'test-skill',
      'do-thing',
      [
        'trigger:',
        '  steps: [do-thing]',
        'params:',
        '  type: object',
        '  required: [order]',
        '  properties:',
        '    order: { type: integer }',
      ].join('\n'),
    );
    const wfPath = writeWorkflow(tmpDir, 'title: Test\nstages:\n  execute:\n    steps: [do-thing]');
    const result = await resolveAllStages(wfPath, baseConfig, {}, agentsDir);

    expect(result.expected_params.order!.required).toBe(true);
  });
});

// ── expandTasksFromParams: JSON Schema defaults and required ────────────────

describe('expandTasksFromParams with JSON Schema params', () => {
  let taskDir: string;

  beforeEach(() => {
    taskDir = resolve(tmpDir, 'task-files');
    mkdirSync(taskDir, { recursive: true });
  });

  function writeTaskFile(name: string, frontmatter: string): string {
    const path = resolve(taskDir, `${name}.md`);
    writeFileSync(path, `---\n${frontmatter}\n---\n# ${name}`);
    return path;
  }

  function makeStageLoaded(steps: Record<string, string>): Record<string, ResolvedStep> {
    const result: Record<string, ResolvedStep> = {};
    for (const [step, taskFile] of Object.entries(steps)) {
      result[step] = {
        task_file: taskFile,
        rules: [],
        blueprints: [],
        config_rules: [],
        config_instructions: [],
      };
    }
    return result;
  }

  it('applies defaults for optional JSON Schema params', async () => {
    const taskFile = writeTaskFile(
      'create-vision',
      [
        'trigger:',
        '  steps: [create-vision]',
        'params:',
        '  type: object',
        '  required: [product_name]',
        '  properties:',
        '    product_name: { type: string }',
        '    features: { type: array, default: [] }',
        '    references: { type: array, default: [] }',
      ].join('\n'),
    );

    const stages: Record<string, StageDefinition> = {
      execute: { steps: ['create-vision'] },
    };
    const params = { product_name: 'My Product' };

    const tasks = await expandTasksFromParams(makeStageLoaded({ 'create-vision': taskFile }), stages, params, [], {});

    expect(tasks).toHaveLength(1);
    expect(tasks[0]!.params!.product_name).toBe('My Product');
    expect(tasks[0]!.params!.features).toEqual([]);
    expect(tasks[0]!.params!.references).toEqual([]);
  });

  it('throws on missing required JSON Schema param', async () => {
    const taskFile = writeTaskFile(
      'create-vision',
      [
        'trigger:',
        '  steps: [create-vision]',
        'params:',
        '  type: object',
        '  required: [product_name, description]',
        '  properties:',
        '    product_name: { type: string }',
        '    description: { type: string }',
      ].join('\n'),
    );

    const stages: Record<string, StageDefinition> = {
      execute: { steps: ['create-vision'] },
    };
    // Only provide one of two required params
    const params = { product_name: 'My Product' };

    await expect(async () =>
      expandTasksFromParams(makeStageLoaded({ 'create-vision': taskFile }), stages, params, [], {}),
    ).rejects.toThrow(/Missing required param 'description'/);
  });

  it('applies default: null for optional object param', async () => {
    const taskFile = writeTaskFile(
      'create-vision',
      [
        'trigger:',
        '  steps: [create-vision]',
        'params:',
        '  type: object',
        '  required: [name]',
        '  properties:',
        '    name: { type: string }',
        '    design_reference:',
        '      type: object',
        '      default: null',
        '      properties:',
        '        url: { type: string }',
      ].join('\n'),
    );

    const stages: Record<string, StageDefinition> = {
      execute: { steps: ['create-vision'] },
    };
    const params = { name: 'Test' };

    const tasks = await expandTasksFromParams(makeStageLoaded({ 'create-vision': taskFile }), stages, params, [], {});

    expect(tasks).toHaveLength(1);
    expect(tasks[0]!.params!.design_reference).toBeNull();
  });

  it('applies default: {} for optional object param', async () => {
    const taskFile = writeTaskFile(
      'run-workflow',
      [
        'trigger:',
        '  steps: [run-workflow]',
        'params:',
        '  type: object',
        '  required: [workflow]',
        '  properties:',
        '    workflow: { type: string }',
        '    params: { type: object, default: {} }',
      ].join('\n'),
    );

    const stages: Record<string, StageDefinition> = {
      execute: { steps: ['run-workflow'] },
    };
    const params = { workflow: 'debo-tokens' };

    const tasks = await expandTasksFromParams(makeStageLoaded({ 'run-workflow': taskFile }), stages, params, [], {});

    expect(tasks).toHaveLength(1);
    expect(tasks[0]!.params!.params).toEqual({});
  });

  it('item params override JSON Schema defaults', async () => {
    const taskFile = writeTaskFile(
      'create-section',
      [
        'trigger:',
        '  steps: [create-section]',
        'params:',
        '  type: object',
        '  required: [section_id]',
        '  properties:',
        '    section_id: { type: string }',
        '    order: { type: integer, default: 0 }',
      ].join('\n'),
    );

    const stages: Record<string, StageDefinition> = {
      execute: { steps: ['create-section'] },
    };
    const params = { section_id: 'hero', order: 5 };

    const tasks = await expandTasksFromParams(makeStageLoaded({ 'create-section': taskFile }), stages, params, [], {});

    expect(tasks).toHaveLength(1);
    expect(tasks[0]!.params!.order).toBe(5);
  });

  it('expands each-based items via explicit binding', async () => {
    const taskFile = writeTaskFile(
      'create-component',
      [
        'trigger:',
        '  steps: [create-component]',
        'params:',
        '  type: object',
        '  required: [component, group]',
        '  properties:',
        '    component: { type: object }',
        '    group: { type: string }',
        'each:',
        '  component:',
        '    expr: "components"',
      ].join('\n'),
    );

    const stages: Record<string, StageDefinition> = {
      execute: { steps: ['create-component'] },
    };
    const params = {
      group: 'atoms',
      components: [{ component_id: 'button', slots: ['default'] }, { component_id: 'icon' }],
    };

    const tasks = await expandTasksFromParams(
      makeStageLoaded({ 'create-component': taskFile }),
      stages,
      params,
      [],
      {},
    );

    expect(tasks).toHaveLength(2);

    // First component — whole object bound under `component`
    expect(tasks[0]!.params!.component).toEqual({ component_id: 'button', slots: ['default'] });
    expect(tasks[0]!.params!.group).toBe('atoms');

    // Second component — just id, no slots
    expect(tasks[1]!.params!.component).toEqual({ component_id: 'icon' });
    expect(tasks[1]!.params!.group).toBe('atoms');
  });

  it('expands each: nested jsonata expression flattens variants across components', async () => {
    const taskFile = writeTaskFile(
      'create-variant-story',
      [
        'trigger:',
        '  steps: [create-variant-story]',
        'params:',
        '  type: object',
        '  required: [variant]',
        '  properties:',
        '    variant: { type: object }',
        'each:',
        '  variant:',
        '    expr: "components.variants"',
      ].join('\n'),
    );

    const stages: Record<string, StageDefinition> = {
      execute: { steps: ['create-variant-story'] },
    };
    const params = {
      components: [
        { component: 'navigation', variants: [{ id: 'main' }, { id: 'footer' }] },
        { component: 'page', variants: [] },
        { component: 'card', variants: [{ id: 'horizontal' }] },
      ],
    };

    const tasks = await expandTasksFromParams(
      makeStageLoaded({ 'create-variant-story': taskFile }),
      stages,
      params,
      [],
      {},
    );

    // JSONata components.variants flattens to 3 variants (page has none)
    expect(tasks).toHaveLength(3);
    expect(tasks[0]!.params!.variant).toEqual({ id: 'main' });
    expect(tasks[1]!.params!.variant).toEqual({ id: 'footer' });
    expect(tasks[2]!.params!.variant).toEqual({ id: 'horizontal' });

    // Task IDs are unique per variant
    const ids = tasks.map((t) => t.id);
    expect(new Set(ids).size).toBe(3);
  });

  it('two tasks on the same step with different each keys expand independently', async () => {
    const componentTask = writeTaskFile(
      'create-component',
      [
        'trigger:',
        '  steps: [create-component]',
        'params:',
        '  type: object',
        '  required: [component]',
        '  properties:',
        '    component: { type: object }',
        'each:',
        '  component:',
        '    expr: "components"',
      ].join('\n'),
    );

    const variantTask = writeTaskFile(
      'create-variant-story',
      [
        'name: test-skill:components:create-variant-story',
        'trigger:',
        '  steps: [create-component]',
        'priority: 10',
        'params:',
        '  type: object',
        '  required: [variant]',
        '  properties:',
        '    variant: { type: object }',
        'each:',
        '  variant:',
        '    expr: "components.variants"',
      ].join('\n'),
    );

    const stageLoaded: Record<string, ResolvedStep[]> = {
      'create-component': [
        { task_file: componentTask, rules: [], blueprints: [], config_rules: [], config_instructions: [] },
        { task_file: variantTask, rules: [], blueprints: [], config_rules: [], config_instructions: [] },
      ],
    };

    const stages: Record<string, StageDefinition> = {
      component: { steps: ['create-component'] },
    };

    const params = {
      components: [
        { component: 'navigation', variants: [{ id: 'main' }, { id: 'footer' }] },
        { component: 'page', variants: [] },
      ],
    };

    const tasks = await expandTasksFromParams(stageLoaded, stages, params, [], {});

    // create-component: 2 components → 2 tasks
    // create-variant-story: 2 variants of navigation → 2 tasks (page has no variants)
    expect(tasks).toHaveLength(4);

    const componentTasks = tasks.filter((t) => t.task_file === componentTask);
    expect(componentTasks).toHaveLength(2);
    expect(componentTasks.map((t) => (t.params!.component as { component: string }).component).sort()).toEqual([
      'navigation',
      'page',
    ]);
    componentTasks.forEach((t) => expect(t.params!.variant).toBeUndefined());

    const variantTasks = tasks.filter((t) => t.task_file === variantTask);
    expect(variantTasks).toHaveLength(2);
    expect(variantTasks.map((t) => (t.params!.variant as Record<string, unknown>).id).sort()).toEqual([
      'footer',
      'main',
    ]);
  });

  it('all params provided — no defaults needed', async () => {
    const taskFile = writeTaskFile(
      'create-vision',
      [
        'trigger:',
        '  steps: [create-vision]',
        'params:',
        '  type: object',
        '  required: [product_name, description]',
        '  properties:',
        '    product_name: { type: string }',
        '    description: { type: string }',
        '    features: { type: array, default: [] }',
      ].join('\n'),
    );

    const stages: Record<string, StageDefinition> = {
      execute: { steps: ['create-vision'] },
    };
    const params = {
      product_name: 'Pet Shop',
      description: 'A pet shop website',
      features: ['search', 'cart'],
    };

    const tasks = await expandTasksFromParams(makeStageLoaded({ 'create-vision': taskFile }), stages, params, [], {});

    expect(tasks).toHaveLength(1);
    expect(tasks[0]!.params!.product_name).toBe('Pet Shop');
    expect(tasks[0]!.params!.description).toBe('A pet shop website');
    expect(tasks[0]!.params!.features).toEqual(['search', 'cart']);
  });

  it('multiple steps — each gets correct param resolution', async () => {
    const taskA = writeTaskFile(
      'step-a',
      [
        'trigger:',
        '  steps: [step-a]',
        'params:',
        '  type: object',
        '  required: [name]',
        '  properties:',
        '    name: { type: string }',
        '    optional_a: { type: string, default: "default-a" }',
      ].join('\n'),
    );

    const taskB = writeTaskFile(
      'step-b',
      [
        'trigger:',
        '  steps: [step-b]',
        'params:',
        '  type: object',
        '  required: [name]',
        '  properties:',
        '    name: { type: string }',
        '    optional_b: { type: array, default: [] }',
      ].join('\n'),
    );

    const stages: Record<string, StageDefinition> = {
      execute: { steps: ['step-a', 'step-b'] },
    };
    const params = { name: 'test' };

    const tasks = await expandTasksFromParams(
      makeStageLoaded({ 'step-a': taskA, 'step-b': taskB }),
      stages,
      params,
      [],
      {},
    );

    expect(tasks).toHaveLength(2);
    expect(tasks[0]!.params!.optional_a).toBe('default-a');
    expect(tasks[1]!.params!.optional_b).toEqual([]);
  });
});

// ── real-world param shapes from migrated task files ────────────────────────

describe('real-world JSON Schema param shapes', () => {
  let taskDir: string;

  beforeEach(() => {
    taskDir = resolve(tmpDir, 'real-tasks');
    mkdirSync(taskDir, { recursive: true });
  });

  function writeTaskFile(name: string, frontmatter: string): string {
    const path = resolve(taskDir, `${name}.md`);
    writeFileSync(path, `---\n${frontmatter}\n---\n# ${name}`);
    return path;
  }

  function makeStageLoaded(steps: Record<string, string>): Record<string, ResolvedStep> {
    const result: Record<string, ResolvedStep> = {};
    for (const [step, taskFile] of Object.entries(steps)) {
      result[step] = {
        task_file: taskFile,
        rules: [],
        blueprints: [],
        config_rules: [],
        config_instructions: [],
      };
    }
    return result;
  }

  it('create-vision shape — all required + mixed optionals', async () => {
    const taskFile = writeTaskFile(
      'create-vision',
      [
        'trigger:',
        '  steps: [create-vision]',
        'params:',
        '  type: object',
        '  required: [product_name, description]',
        '  properties:',
        '    product_name: { type: string }',
        '    description: { type: string }',
        '    problems: { type: array, default: [] }',
        '    features: { type: array, default: [] }',
        '    design_reference:',
        '      type: object',
        '      default: null',
        '      properties:',
        '        type: { type: string }',
        '        url: { type: string }',
        '        label: { type: string }',
        '    references: { type: array, default: [] }',
      ].join('\n'),
    );

    const stages: Record<string, StageDefinition> = {
      execute: { steps: ['create-vision'] },
    };

    // Minimal required params only
    const tasks = await expandTasksFromParams(
      makeStageLoaded({ 'create-vision': taskFile }),
      stages,
      { product_name: 'Pet Shop', description: 'Online pet shop' },
      [],
      {},
    );

    expect(tasks).toHaveLength(1);
    const p = tasks[0]!.params!;
    expect(p.product_name).toBe('Pet Shop');
    expect(p.description).toBe('Online pet shop');
    expect(p.problems).toEqual([]);
    expect(p.features).toEqual([]);
    expect(p.design_reference).toBeNull();
    expect(p.references).toEqual([]);
  });

  it('create-vision shape — with optional params provided', async () => {
    const taskFile = writeTaskFile(
      'create-vision',
      [
        'trigger:',
        '  steps: [create-vision]',
        'params:',
        '  type: object',
        '  required: [product_name, description]',
        '  properties:',
        '    product_name: { type: string }',
        '    description: { type: string }',
        '    problems: { type: array, default: [] }',
        '    features: { type: array, default: [] }',
        '    design_reference:',
        '      type: object',
        '      default: null',
        '      properties:',
        '        type: { type: string }',
        '        url: { type: string }',
        '        label: { type: string }',
        '    references: { type: array, default: [] }',
      ].join('\n'),
    );

    const stages: Record<string, StageDefinition> = {
      execute: { steps: ['create-vision'] },
    };

    const tasks = await expandTasksFromParams(
      makeStageLoaded({ 'create-vision': taskFile }),
      stages,
      {
        product_name: 'Pet Shop',
        description: 'Online pet shop',
        design_reference: { type: 'stitch', url: 'proj-123', label: 'Main Design' },
        features: ['search', 'cart', 'checkout'],
      },
      [],
      {},
    );

    expect(tasks).toHaveLength(1);
    const p = tasks[0]!.params!;
    expect(p.design_reference).toEqual({ type: 'stitch', url: 'proj-123', label: 'Main Design' });
    expect(p.features).toEqual(['search', 'cart', 'checkout']);
    expect(p.problems).toEqual([]); // still default
    expect(p.references).toEqual([]); // still default
  });

  it('create-section shape — required strings + integer with default', async () => {
    const taskFile = writeTaskFile(
      'create-section',
      [
        'trigger:',
        '  steps: [create-section]',
        'params:',
        '  type: object',
        '  required: [section_id, section_title, section_description]',
        '  properties:',
        '    section_id: { type: string }',
        '    section_title: { type: string }',
        '    section_description: { type: string }',
        '    order: { type: integer, default: 0 }',
      ].join('\n'),
    );

    const stages: Record<string, StageDefinition> = {
      execute: { steps: ['create-section'] },
    };

    const tasks = await expandTasksFromParams(
      makeStageLoaded({ 'create-section': taskFile }),
      stages,
      { section_id: 'hero', section_title: 'Hero', section_description: 'Landing page hero' },
      [],
      {},
    );

    expect(tasks).toHaveLength(1);
    expect(tasks[0]!.params!.order).toBe(0);
  });

  it('run-workflow shape — string + object default {}', async () => {
    const taskFile = writeTaskFile(
      'run-workflow',
      [
        'trigger:',
        '  steps: [run-workflow]',
        'params:',
        '  type: object',
        '  required: [workflow]',
        '  properties:',
        '    workflow: { type: string }',
        '    params: { type: object, default: {} }',
      ].join('\n'),
    );

    const stages: Record<string, StageDefinition> = {
      execute: { steps: ['run-workflow'] },
    };

    const tasks = await expandTasksFromParams(
      makeStageLoaded({ 'run-workflow': taskFile }),
      stages,
      { workflow: 'debo-tokens' },
      [],
      {},
    );

    expect(tasks).toHaveLength(1);
    expect(tasks[0]!.params!.workflow).toBe('debo-tokens');
    expect(tasks[0]!.params!.params).toEqual({});
  });
});
