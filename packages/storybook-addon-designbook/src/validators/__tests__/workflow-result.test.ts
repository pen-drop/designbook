/**
 * Integration tests for the workflow result + scope lifecycle.
 *
 * Tests the full pipeline: workflowResult (data + file) → workflowDone (gate + stage completion)
 * → scope collection → stage progress reporting.
 *
 * Uses real temp directories, no mocks.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { load as parseYaml, dump as stringifyYaml } from 'js-yaml';
import {
  workflowCreate,
  workflowPlan,
  workflowResult,
  workflowDone,
  type WorkflowFile,
  type WorkflowTask,
} from '../../workflow.js';
import type { DesignbookConfig } from '../../config.js';

// ── helpers ─────────────────────────────────────────────────────────────────

function readTasksYml(dist: string, name: string): WorkflowFile {
  // Try changes/ first, fall back to archive/ (direct engine archives on completion)
  const changesPath = resolve(dist, 'workflows', 'changes', name, 'tasks.yml');
  if (existsSync(changesPath)) {
    return parseYaml(readFileSync(changesPath, 'utf-8')) as WorkflowFile;
  }
  const archivePath = resolve(dist, 'workflows', 'archive', name, 'tasks.yml');
  return parseYaml(readFileSync(archivePath, 'utf-8')) as WorkflowFile;
}

function writeTasksYml(dist: string, name: string, data: WorkflowFile): void {
  writeFileSync(resolve(dist, 'workflows', 'changes', name, 'tasks.yml'), stringifyYaml(data));
}

/** Create a workflow with pre-planned tasks that use result: declarations */
function setupWorkflow(
  dist: string,
  tasks: WorkflowTask[],
  stages: Record<string, { steps?: string[] }>,
  opts?: { scope?: Record<string, unknown>; schemas?: Record<string, object> },
): string {
  const name = workflowCreate(dist, 'debo-test', 'Test Workflow', []);
  workflowPlan(dist, name, tasks, stages, undefined, undefined, undefined, undefined, 'direct');

  // Patch tasks.yml with result declarations and optional scope/schemas
  const data = readTasksYml(dist, name);
  for (const planned of data.tasks) {
    const source = tasks.find((t) => t.id === planned.id);
    if (source?.result) {
      planned.result = source.result;
    }
  }
  if (opts?.scope) data.scope = opts.scope;
  if (opts?.schemas) data.schemas = opts.schemas;
  writeTasksYml(dist, name, data);

  return name;
}

const mockConfig: DesignbookConfig = {
  data: '/tmp/test-designbook',
  technology: 'html',
  extensions: [],
};

// ── single-task data result ────────────────────────────────────────────────

describe('workflow result: single-task data result', () => {
  let dist: string;

  beforeEach(() => {
    dist = mkdtempSync(resolve(tmpdir(), 'wf-result-data-'));
  });

  it('stores data result inline and flows to scope at stage completion', async () => {
    const name = setupWorkflow(
      dist,
      [
        {
          id: 'setup-compare',
          title: 'Setup Compare',
          type: 'data',
          step: 'setup-compare',
          stage: 'setup',
          status: 'pending',
          result: {
            checks: {
              schema: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['storyId', 'breakpoint'],
                  properties: {
                    storyId: { type: 'string' },
                    breakpoint: { type: 'string' },
                  },
                },
              },
            },
          },
        } as WorkflowTask,
      ],
      { setup: { steps: ['setup-compare'] } },
    );

    const checks = [
      { storyId: 'shell', breakpoint: 'sm' },
      { storyId: 'shell', breakpoint: 'xl' },
    ];

    // Write data result
    const result = await workflowResult(dist, name, 'setup-compare', 'checks', checks, mockConfig);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.file_path).toBeUndefined(); // data results have no file_path

    // Verify stored in tasks.yml
    const data = readTasksYml(dist, name);
    expect(data.tasks[0]!.result!.checks!.value).toEqual(checks);
    expect(data.tasks[0]!.result!.checks!.valid).toBe(true);

    // Mark done — triggers stage completion → scope update
    const doneResult = await workflowDone(dist, name, 'setup-compare');
    expect(doneResult.response?.stage_complete).toBe(true);
    expect(doneResult.response?.stage_progress).toBe('1/1');

    // Scope updated
    const afterDone = readTasksYml(dist, name);
    expect(afterDone.scope?.checks).toEqual(checks);
  });

  it('rejects data result that fails JSON Schema validation', async () => {
    const name = setupWorkflow(
      dist,
      [
        {
          id: 'task1',
          title: 'T1',
          type: 'data',
          step: 'do-task',
          stage: 'execute',
          status: 'pending',
          result: {
            items: {
              schema: {
                type: 'array',
                items: { type: 'object', required: ['name'], properties: { name: { type: 'string' } } },
              },
            },
          },
        } as WorkflowTask,
      ],
      { execute: { steps: ['do-task'] } },
    );

    // Pass invalid data — items should be array of objects with 'name', but send an object instead
    const result = await workflowResult(dist, name, 'task1', 'items', { wrong: 'type' }, mockConfig);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);

    // Task cannot be marked done
    await expect(() => workflowDone(dist, name, 'task1')).rejects.toThrow('result(s) have errors');
  });

  it('rejects workflow done when data result not yet written', async () => {
    const name = setupWorkflow(
      dist,
      [
        {
          id: 'task1',
          title: 'T1',
          type: 'data',
          step: 'do-task',
          stage: 'execute',
          status: 'pending',
          result: {
            checks: { schema: { type: 'array' } },
          },
        } as WorkflowTask,
      ],
      { execute: { steps: ['do-task'] } },
    );

    // Try to mark done without writing the result
    await expect(() => workflowDone(dist, name, 'task1')).rejects.toThrow('not yet written');
  });
});

// ── file result with flush ─────────────────────────────────────────────────

describe('workflow result: file result via workflow done --data', () => {
  let dist: string;
  let config: DesignbookConfig;

  beforeEach(() => {
    dist = mkdtempSync(resolve(tmpdir(), 'wf-result-file-'));
    config = { data: dist, technology: 'html', extensions: [] };
  });

  it('writes file result to disk via workflow done --data', async () => {
    const targetPath = resolve(dist, 'output', 'tokens.yml');
    const name = setupWorkflow(
      dist,
      [
        {
          id: 'create-tokens',
          title: 'Create Tokens',
          type: 'tokens',
          step: 'create-tokens',
          stage: 'execute',
          status: 'pending',
          result: {
            'design-tokens': { path: targetPath },
          },
        } as WorkflowTask,
      ],
      { execute: { steps: ['create-tokens'] } },
    );

    const value = { color: { primary: { $value: '#ff0000', $type: 'color' } } };
    const doneResult = await workflowDone(dist, name, 'create-tokens', undefined, {
      data: { 'design-tokens': value },
      config,
    });

    expect(doneResult.data.tasks[0]!.result!['design-tokens']!.valid).toBe(true);
    expect(existsSync(targetPath)).toBe(true);

    // File result does NOT flow to scope
    const data = readTasksYml(dist, name);
    expect(data.scope?.['design-tokens']).toBeUndefined();
  });

  it('flushes immediately when flush=immediately in result declaration', async () => {
    const targetPath = resolve(dist, 'output', 'ref.md');
    const name = setupWorkflow(
      dist,
      [
        {
          id: 'task1',
          title: 'T1',
          type: 'data',
          step: 'do-task',
          stage: 'execute',
          status: 'pending',
          result: {
            reference: { path: targetPath, flush: 'immediate' },
          },
        } as WorkflowTask,
      ],
      { execute: { steps: ['do-task'] } },
    );

    await workflowDone(dist, name, 'task1', undefined, { data: { reference: '# Design Reference' }, config });

    // Flushed immediately — file at final path
    expect(existsSync(targetPath)).toBe(true);
    expect(readFileSync(targetPath, 'utf-8')).toBe('# Design Reference');
  });

  it('validates file result against JSON Schema via workflow done --data', async () => {
    const targetPath = resolve(dist, 'output', 'component.yml');
    const componentSchema = {
      type: 'object',
      required: ['name', 'status'],
      properties: {
        name: { type: 'string' },
        status: { type: 'string' },
      },
    };

    const name = setupWorkflow(
      dist,
      [
        {
          id: 'task1',
          title: 'T1',
          type: 'component',
          step: 'create-component',
          stage: 'execute',
          status: 'pending',
          result: {
            'component-yml': { path: targetPath, schema: componentSchema },
          },
        } as WorkflowTask,
      ],
      { execute: { steps: ['create-component'] } },
    );

    const doneResult = await workflowDone(dist, name, 'task1', undefined, {
      data: { 'component-yml': { name: 'Button', status: 'stable' } },
      config,
    });
    expect(doneResult.data.tasks[0]!.result!['component-yml']!.valid).toBe(true);
  });

  it('rejects file result that fails JSON Schema validation via workflow done --data', async () => {
    const targetPath = resolve(dist, 'output', 'component.yml');
    const componentSchema = {
      type: 'object',
      required: ['name', 'status'],
      properties: {
        name: { type: 'string' },
        status: { type: 'string' },
      },
    };

    const name = setupWorkflow(
      dist,
      [
        {
          id: 'task1',
          title: 'T1',
          type: 'component',
          step: 'create-component',
          stage: 'execute',
          status: 'pending',
          result: {
            'component-yml': { path: targetPath, schema: componentSchema },
          },
        } as WorkflowTask,
      ],
      { execute: { steps: ['create-component'] } },
    );

    // Invalid — missing required 'status' field
    const doneResult = await workflowDone(dist, name, 'task1', undefined, {
      data: { 'component-yml': { name: 'Button' } },
      config,
    });
    expect(doneResult.response?.validation_errors?.some((e: string) => e.includes('status'))).toBe(true);
  });

  it('rejects workflow result for non-external file result', async () => {
    const targetPath = resolve(dist, 'output', 'tokens.yml');
    const name = setupWorkflow(
      dist,
      [
        {
          id: 'task1',
          title: 'T1',
          type: 'tokens',
          step: 'create-tokens',
          stage: 'execute',
          status: 'pending',
          result: {
            'design-tokens': { path: targetPath },
          },
        } as WorkflowTask,
      ],
      { execute: { steps: ['create-tokens'] } },
    );

    await expect(workflowResult(dist, name, 'task1', 'design-tokens', null, config)).rejects.toThrow(
      'is not declared as `submission: direct`',
    );
  });
});

// ── fan-out / fan-in (each-stage) ──────────────────────────────────────────

describe('workflow result: fan-out / fan-in', () => {
  let dist: string;

  beforeEach(() => {
    dist = mkdtempSync(resolve(tmpdir(), 'wf-result-fanin-'));
  });

  it('concatenates array data results from each-stage tasks into scope', async () => {
    // Simulate: 3 compare tasks, each producing issues[]
    const name = setupWorkflow(
      dist,
      [
        {
          id: 'compare-sm-header',
          title: 'Compare SM Header',
          type: 'validation',
          step: 'compare',
          stage: 'compare',
          status: 'pending',
          result: { issues: { schema: { type: 'array' } } },
        } as WorkflowTask,
        {
          id: 'compare-sm-footer',
          title: 'Compare SM Footer',
          type: 'validation',
          step: 'compare',
          stage: 'compare',
          status: 'pending',
          result: { issues: { schema: { type: 'array' } } },
        } as WorkflowTask,
        {
          id: 'compare-xl-header',
          title: 'Compare XL Header',
          type: 'validation',
          step: 'compare',
          stage: 'compare',
          status: 'pending',
          result: { issues: { schema: { type: 'array' } } },
        } as WorkflowTask,
      ],
      { compare: { steps: ['compare'] } },
    );

    // Task 1: produces 2 issues
    await workflowResult(
      dist,
      name,
      'compare-sm-header',
      'issues',
      [
        { severity: 'major', description: 'Color mismatch' },
        { severity: 'minor', description: 'Spacing off' },
      ],
      mockConfig,
    );
    const done1 = await workflowDone(dist, name, 'compare-sm-header');
    expect(done1.response?.stage_progress).toBe('1/3');
    expect(done1.response?.stage_complete).toBe(false);

    // Task 2: produces 1 issue
    await workflowResult(
      dist,
      name,
      'compare-sm-footer',
      'issues',
      [{ severity: 'critical', description: 'Missing' }],
      mockConfig,
    );
    const done2 = await workflowDone(dist, name, 'compare-sm-footer');
    expect(done2.response?.stage_progress).toBe('2/3');
    expect(done2.response?.stage_complete).toBe(false);

    // Task 3: produces 0 issues (empty array)
    await workflowResult(dist, name, 'compare-xl-header', 'issues', [], mockConfig);
    const done3 = await workflowDone(dist, name, 'compare-xl-header');
    expect(done3.response?.stage_progress).toBe('3/3');
    expect(done3.response?.stage_complete).toBe(true);

    // Scope: concatenated issues
    expect(done3.response?.scope_update?.issues).toEqual([
      { severity: 'major', description: 'Color mismatch' },
      { severity: 'minor', description: 'Spacing off' },
      { severity: 'critical', description: 'Missing' },
    ]);

    // Verify persisted
    const data = readTasksYml(dist, name);
    expect(data.scope?.issues).toEqual([
      { severity: 'major', description: 'Color mismatch' },
      { severity: 'minor', description: 'Spacing off' },
      { severity: 'critical', description: 'Missing' },
    ]);
  });
});

// ── scope overwrite ────────────────────────────────────────────────────────

describe('workflow result: scope overwrite', () => {
  let dist: string;

  beforeEach(() => {
    dist = mkdtempSync(resolve(tmpdir(), 'wf-result-scope-'));
  });

  it('later stage overwrites scope key (last writer wins)', async () => {
    const name = setupWorkflow(
      dist,
      [
        {
          id: 'compare-task',
          title: 'Compare',
          type: 'validation',
          step: 'compare',
          stage: 'compare',
          status: 'pending',
          result: { issues: { schema: { type: 'array' } } },
        } as WorkflowTask,
        {
          id: 'triage-task',
          title: 'Triage',
          type: 'data',
          step: 'triage',
          stage: 'triage',
          status: 'pending',
          result: { issues: { schema: { type: 'array' } } },
        } as WorkflowTask,
      ],
      { compare: { steps: ['compare'] }, triage: { steps: ['triage'] } },
    );

    // Compare produces raw issues
    const rawIssues = [
      { severity: 'major', description: 'raw issue 1' },
      { severity: 'minor', description: 'raw issue 2' },
    ];
    await workflowResult(dist, name, 'compare-task', 'issues', rawIssues, mockConfig);
    await workflowDone(dist, name, 'compare-task');

    let data = readTasksYml(dist, name);
    expect(data.scope?.issues).toEqual(rawIssues);

    // Triage consolidates and produces fewer issues → overwrites scope.issues
    const consolidated = [{ severity: 'major', description: 'consolidated issue' }];
    await workflowResult(dist, name, 'triage-task', 'issues', consolidated, mockConfig);
    await workflowDone(dist, name, 'triage-task');

    data = readTasksYml(dist, name);
    expect(data.scope?.issues).toEqual(consolidated); // overwritten
  });
});

// ── unknown result key ─────────────────────────────────────────────────────

describe('workflow result: error handling', () => {
  let dist: string;

  beforeEach(() => {
    dist = mkdtempSync(resolve(tmpdir(), 'wf-result-err-'));
  });

  it('rejects unknown result key', async () => {
    const name = setupWorkflow(
      dist,
      [
        {
          id: 'task1',
          title: 'T1',
          type: 'data',
          step: 'do-task',
          stage: 'execute',
          status: 'pending',
          result: { checks: { schema: { type: 'array' } } },
        } as WorkflowTask,
      ],
      { execute: { steps: ['do-task'] } },
    );

    await expect(workflowResult(dist, name, 'task1', 'unknown-key', [], mockConfig)).rejects.toThrow(
      "Unknown result key 'unknown-key'",
    );
  });

  it('rejects result on task with no result declarations', async () => {
    const name = setupWorkflow(
      dist,
      [{ id: 'task1', title: 'T1', type: 'data', step: 'do-task', stage: 'execute', status: 'pending' }],
      { execute: { steps: ['do-task'] } },
    );

    await expect(workflowResult(dist, name, 'task1', 'anything', [], mockConfig)).rejects.toThrow(
      'has no result declarations',
    );
  });

  it('rejects result on unknown task', async () => {
    const name = setupWorkflow(
      dist,
      [{ id: 'task1', title: 'T1', type: 'data', step: 'do-task', stage: 'execute', status: 'pending' }],
      { execute: { steps: ['do-task'] } },
    );

    await expect(workflowResult(dist, name, 'nope', 'anything', [], mockConfig)).rejects.toThrow(
      'Task not found: nope',
    );
  });

  it('rejects invalid JSON string for data result', async () => {
    const name = setupWorkflow(
      dist,
      [
        {
          id: 'task1',
          title: 'T1',
          type: 'data',
          step: 'do-task',
          stage: 'execute',
          status: 'pending',
          result: { data: {} },
        } as WorkflowTask,
      ],
      { execute: { steps: ['do-task'] } },
    );

    await expect(workflowResult(dist, name, 'task1', 'data', '{invalid json', mockConfig)).rejects.toThrow(
      'requires valid JSON',
    );
  });
});

// ── mixed results (file + data on same task) ───────────────────────────────

describe('workflow result: mixed file + data results', () => {
  let dist: string;
  let config: DesignbookConfig;

  beforeEach(() => {
    dist = mkdtempSync(resolve(tmpdir(), 'wf-result-mixed-'));
    config = { data: dist, technology: 'html', extensions: [] };
  });

  it('task with both file and data results — only data flows to scope', async () => {
    const filePath = resolve(dist, 'output', 'component.yml');
    const name = setupWorkflow(
      dist,
      [
        {
          id: 'task1',
          title: 'Create Component',
          type: 'component',
          step: 'create-component',
          stage: 'execute',
          status: 'pending',
          result: {
            'component-yml': { path: filePath },
            metadata: { schema: { type: 'object' } },
          },
        } as WorkflowTask,
      ],
      { execute: { steps: ['create-component'] } },
    );

    // Submit both file and data results via workflow done --data
    const doneResult = await workflowDone(dist, name, 'task1', undefined, {
      data: {
        'component-yml': { name: 'Button' },
        metadata: { name: 'Button', slots: ['content'] },
      },
      config,
    });
    expect(doneResult.response?.stage_complete).toBe(true);

    // Scope: only data result, not file result
    const data = readTasksYml(dist, name);
    expect(data.scope?.metadata).toEqual({ name: 'Button', slots: ['content'] });
    expect(data.scope?.['component-yml']).toBeUndefined();
  });
});

// ── external file result (content=null, e.g. screenshots) ──────────────────

describe('workflow result: external file (screenshot)', () => {
  let dist: string;
  let config: DesignbookConfig;

  beforeEach(() => {
    dist = mkdtempSync(resolve(tmpdir(), 'wf-result-ext-'));
    config = { data: dist, technology: 'html', extensions: [] };
  });

  it('validates externally written file (content=null)', async () => {
    const screenshotPath = resolve(dist, 'screenshots', 'sm-header.png');

    const name = setupWorkflow(
      dist,
      [
        {
          id: 'capture-task',
          title: 'Capture',
          type: 'validation',
          step: 'capture',
          stage: 'capture',
          status: 'pending',
          result: {
            screenshot: { path: screenshotPath, submission: 'direct' },
          },
        } as WorkflowTask,
      ],
      { capture: { steps: ['capture'] } },
    );

    // Simulate Playwright writing the file externally
    mkdirSync(resolve(dist, 'screenshots'), { recursive: true });
    // Write a minimal valid PNG (8-byte signature + IHDR)
    const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const ihdrLength = Buffer.alloc(4);
    ihdrLength.writeUInt32BE(13);
    const ihdrType = Buffer.from('IHDR');
    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(100, 0); // width
    ihdrData.writeUInt32BE(100, 4); // height
    ihdrData.writeUInt8(8, 8); // bit depth
    ihdrData.writeUInt8(2, 9); // color type (truecolor)
    const ihdrCrc = Buffer.alloc(4);
    const iendLength = Buffer.alloc(4);
    const iendType = Buffer.from('IEND');
    const iendCrc = Buffer.alloc(4);
    const png = Buffer.concat([pngSignature, ihdrLength, ihdrType, ihdrData, ihdrCrc, iendLength, iendType, iendCrc]);
    writeFileSync(screenshotPath, png);

    // Validate externally written file (content=null)
    const result = await workflowResult(dist, name, 'capture-task', 'screenshot', null, config);
    expect(result.valid).toBe(true);
    expect(result.file_path).toBe(screenshotPath);
  });
});

// ── task without result declarations (side-effect only) ────────────────────

describe('workflow result: side-effect-only task', () => {
  let dist: string;

  beforeEach(() => {
    dist = mkdtempSync(resolve(tmpdir(), 'wf-result-noresult-'));
  });

  it('task without result: can be marked done without any result calls', async () => {
    const name = setupWorkflow(
      dist,
      [
        {
          id: 'outtake',
          title: 'Outtake',
          type: 'data',
          step: 'outtake',
          stage: 'outtake',
          status: 'pending',
          // No result: declaration
        },
      ],
      { outtake: { steps: ['outtake'] } },
    );

    // Should succeed — no results to gate on
    const result = await workflowDone(dist, name, 'outtake');
    expect(result.data.tasks[0]!.status).toBe('done');
  });
});

// ── workflow done --data ──────────────────────────────────────────────────────

describe('workflow done --data', () => {
  let dist: string;

  beforeEach(() => {
    dist = mkdtempSync(resolve(tmpdir(), 'wf-done-data-'));
  });

  it('distributes data keys to result entries and marks task done', async () => {
    const name = setupWorkflow(
      dist,
      [
        {
          id: 'create-vision',
          title: 'Create Vision',
          type: 'data',
          step: 'create-vision',
          stage: 'create-vision',
          status: 'pending',
          result: {
            scene: { schema: { type: 'string' } },
            reference: { schema: { type: 'array', items: { type: 'string' } } },
          },
        } as WorkflowTask,
      ],
      { 'create-vision': { steps: ['create-vision'] } },
    );

    const result = await workflowDone(dist, name, 'create-vision', undefined, {
      data: { scene: 'shell', reference: ['figma.com/abc'] },
    });

    expect(result.data.tasks[0]!.status).toBe('done');
    expect(result.data.tasks[0]!.result!.scene!.value).toBe('shell');
    expect(result.data.tasks[0]!.result!.scene!.valid).toBe(true);
    expect(result.data.tasks[0]!.result!.reference!.value).toEqual(['figma.com/abc']);
  });

  it('errors on unknown keys in --data', async () => {
    const name = setupWorkflow(
      dist,
      [
        {
          id: 'task1',
          title: 'T1',
          type: 'data',
          step: 'do-task',
          stage: 'execute',
          status: 'pending',
          result: {
            known_key: { schema: { type: 'string' } },
          },
        } as WorkflowTask,
      ],
      { execute: { steps: ['do-task'] } },
    );

    await expect(() =>
      workflowDone(dist, name, 'task1', undefined, {
        data: { known_key: 'ok', unknown_key: 'bad' },
      }),
    ).rejects.toThrow('Unknown result key(s)');
  });

  it('returns validation_errors when data fails schema validation', async () => {
    const name = setupWorkflow(
      dist,
      [
        {
          id: 'task1',
          title: 'T1',
          type: 'data',
          step: 'do-task',
          stage: 'execute',
          status: 'pending',
          result: {
            items: {
              schema: {
                type: 'array',
                items: { type: 'object', required: ['name'], properties: { name: { type: 'string' } } },
              },
            },
          },
        } as WorkflowTask,
      ],
      { execute: { steps: ['do-task'] } },
    );

    // Pass invalid data — should return validation_errors, not throw
    const result = await workflowDone(dist, name, 'task1', undefined, {
      data: { items: 'not-an-array' },
    });

    expect(result.response?.validation_errors).toBeDefined();
    expect(result.response!.validation_errors!.length).toBeGreaterThan(0);
    // Task should still be in-progress
    expect(result.data.tasks[0]!.status).not.toBe('done');
  });

  it('auto-fills defaults for missing data results', async () => {
    const name = setupWorkflow(
      dist,
      [
        {
          id: 'task1',
          title: 'T1',
          type: 'data',
          step: 'do-task',
          stage: 'execute',
          status: 'pending',
          result: {
            name: { schema: { type: 'string' } },
            config: { schema: { type: 'object', default: {} } },
          },
        } as WorkflowTask,
      ],
      { execute: { steps: ['do-task'] } },
    );

    // Only provide 'name', 'config' should auto-fill from schema default
    const result = await workflowDone(dist, name, 'task1', undefined, {
      data: { name: 'test' },
    });

    expect(result.data.tasks[0]!.status).toBe('done');
    expect(result.data.tasks[0]!.result!.config!.value).toEqual({});
    expect(result.data.tasks[0]!.result!.config!.valid).toBe(true);
  });

  it('serializes file result from --data to .yml', async () => {
    const targetPath = resolve(dist, 'output', 'tokens.yml');
    const name = setupWorkflow(
      dist,
      [
        {
          id: 'task1',
          title: 'T1',
          type: 'tokens',
          step: 'create-tokens',
          stage: 'execute',
          status: 'pending',
          result: {
            'design-tokens': {
              path: targetPath,
            },
          },
        } as WorkflowTask,
      ],
      { execute: { steps: ['create-tokens'] } },
    );

    const result = await workflowDone(dist, name, 'task1', undefined, {
      data: { 'design-tokens': { primitive: { color: { red: '#ff0000' } } } },
    });

    expect(result.data.tasks[0]!.status).toBe('done');
    // File should be written (direct engine stashes at .debo path)
    expect(result.data.tasks[0]!.result!['design-tokens']!.valid).toBe(true);
  });

  it('rejects files written directly at declared paths', async () => {
    const targetPath = resolve(dist, 'output', 'vision.yml');
    // Pre-write the file directly (bypassing workflow done --data)
    mkdirSync(resolve(dist, 'output'), { recursive: true });
    writeFileSync(targetPath, '# My Product\n\nA great product.\n');

    const name = setupWorkflow(
      dist,
      [
        {
          id: 'task1',
          title: 'T1',
          type: 'data',
          step: 'create-vision',
          stage: 'execute',
          status: 'pending',
          result: {
            vision: { path: targetPath },
          },
        } as WorkflowTask,
      ],
      { execute: { steps: ['create-vision'] } },
    );

    // Call done WITHOUT submitting via --data — should fail because file was written directly
    await expect(workflowDone(dist, name, 'task1')).rejects.toThrow(
      'were written directly instead of via `workflow done --data`',
    );
  });
});
