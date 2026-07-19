/**
 * `workflow batch-done`: submit a directory of per-task result files through the
 * same workflowDone path as a single `workflow done --data`.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { dump as dumpYaml } from 'js-yaml';
import { loadConfig } from '../../config.js';
import { parseBatchEntry, readBatchEntries, runBatchDone } from '../workflow-batch-done.js';
import type { WorkflowFile } from '../../workflow.js';

describe('workflow-batch-done: parsing', () => {
  it('parses a well-formed entry', () => {
    const e = parseBatchEntry({ task: 'card', data: { note: 'x' }, summary: 's' }, 'card.json');
    expect(e).toEqual({ task: 'card', data: { note: 'x' }, summary: 's' });
  });

  it('rejects an entry without a task id', () => {
    expect(() => parseBatchEntry({ data: {} }, 'bad.json')).toThrow(/non-empty string "task"/);
  });

  it('rejects an entry without a data object', () => {
    expect(() => parseBatchEntry({ task: 'card' }, 'bad.json')).toThrow(/object "data"/);
  });
});

describe('workflow-batch-done: submission', () => {
  let tmpRoot: string;
  let dataDir: string;
  let previousCwd: string;

  beforeEach(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'wf-batch-done-'));
    dataDir = join(tmpRoot, 'designbook');
    mkdirSync(dataDir, { recursive: true });
    writeFileSync(join(tmpRoot, 'designbook.config.yml'), dumpYaml({ designbook: { data: 'designbook' } }));
    previousCwd = process.cwd();
    process.chdir(tmpRoot);
  });

  afterEach(() => {
    process.chdir(previousCwd);
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  /** Write a minimal running workflow with two pending data tasks in one stage. */
  function writeWorkflow(name: string): void {
    const wf: WorkflowFile = {
      title: 'Batch WF',
      workflow: 'batch-wf',
      status: 'running',
      engine: 'direct',
      workflow_id: 'abcd',
      current_stage: 'component',
      stages: { component: { steps: ['create-component'] } },
      started_at: new Date(0).toISOString(),
      tasks: [
        {
          id: 'card',
          title: 'card',
          type: 'data',
          step: 'create-component',
          stage: 'component',
          status: 'in-progress',
          result: { note: {} },
        },
        {
          id: 'hero',
          title: 'hero',
          type: 'data',
          step: 'create-component',
          stage: 'component',
          status: 'pending',
          result: { note: {} },
        },
      ],
    };
    const changesDir = resolve(dataDir, 'workflows', 'changes', name);
    mkdirSync(changesDir, { recursive: true });
    writeFileSync(resolve(changesDir, 'tasks.yml'), dumpYaml(wf));
  }

  function writeBatchFile(dir: string, file: string, entry: unknown): void {
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, file), JSON.stringify(entry));
  }

  it('reads all *.json entries from a directory, sorted', () => {
    const dir = join(tmpRoot, 'batch');
    writeBatchFile(dir, 'b.json', { task: 'hero', data: { note: 'h' } });
    writeBatchFile(dir, 'a.json', { task: 'card', data: { note: 'c' } });
    writeBatchFile(dir, 'ignore.txt', 'nope');
    const { entries, failures } = readBatchEntries(dir);
    expect(entries.map((e) => e.task)).toEqual(['card', 'hero']);
    expect(failures).toEqual([]);
  });

  it('collects a malformed *.json as a per-file failure instead of aborting the batch', () => {
    const dir = join(tmpRoot, 'batch');
    writeBatchFile(dir, 'good.json', { task: 'card', data: { note: 'c' } });
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, 'broken.json'), '{not json');
    const { entries, failures } = readBatchEntries(dir);
    expect(entries.map((e) => e.task)).toEqual(['card']);
    expect(failures).toHaveLength(1);
    expect(failures[0]!.task).toBe('broken.json');
    expect(failures[0]!.valid).toBe(false);
  });

  it('submits every task in the directory and reports all valid', async () => {
    const config = loadConfig();
    writeWorkflow('batch-run');
    const dir = join(tmpRoot, 'batch');
    writeBatchFile(dir, 'card.json', { task: 'card', data: { note: 'c' }, summary: 'card done' });
    writeBatchFile(dir, 'hero.json', { task: 'hero', data: { note: 'h' } });

    const results = await runBatchDone(config.data, 'batch-run', dir, config);
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.valid)).toBe(true);
    expect(results.map((r) => r.task).sort()).toEqual(['card', 'hero']);
  });

  it('treats an already-done task as skipped/success on re-run', async () => {
    const config = loadConfig();
    writeWorkflow('batch-run');
    const dir = join(tmpRoot, 'batch');
    writeBatchFile(dir, 'card.json', { task: 'card', data: { note: 'c' } });

    // First run completes the task.
    await runBatchDone(config.data, 'batch-run', dir, config);
    // Re-run: the task is already done — must be reported valid + skipped, not a failure.
    const results = await runBatchDone(config.data, 'batch-run', dir, config);
    expect(results).toHaveLength(1);
    expect(results[0]!.task).toBe('card');
    expect(results[0]!.valid).toBe(true);
    expect(results[0]!.skipped).toBe(true);
  });

  it('records a per-task failure for an unknown task id and keeps going', async () => {
    const config = loadConfig();
    writeWorkflow('batch-run');
    const dir = join(tmpRoot, 'batch');
    writeBatchFile(dir, 'card.json', { task: 'card', data: { note: 'c' } });
    writeBatchFile(dir, 'ghost.json', { task: 'does-not-exist', data: { note: 'x' } });

    const results = await runBatchDone(config.data, 'batch-run', dir, config);
    const byTask = Object.fromEntries(results.map((r) => [r.task, r]));
    expect(byTask['card']!.valid).toBe(true);
    expect(byTask['does-not-exist']!.valid).toBe(false);
    expect(byTask['does-not-exist']!.errors.join(' ')).toMatch(/Task not found/);
  });
});
