import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { load as parseYaml } from 'js-yaml';
import { workflowCreate, workflowDone, type WorkflowFile } from '../../workflow.js';
import type { DesignbookConfig } from '../../config.js';

describe('workflowDone awaiting-after behaviour', () => {
  let dataDir: string;
  const config: DesignbookConfig = { data: '', technology: 'html', extensions: [] };

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), 'wf-await-after-'));
    config.data = dataDir;
  });

  afterEach(() => rmSync(dataDir, { recursive: true, force: true }));

  function readTasksYml(name: string): WorkflowFile {
    const changesPath = resolve(dataDir, 'workflows', 'changes', name, 'tasks.yml');
    return parseYaml(readFileSync(changesPath, 'utf-8')) as WorkflowFile;
  }

  it('sets awaiting-after instead of archiving when after: is declared', async () => {
    const name = workflowCreate(
      dataDir,
      'debo-test',
      'Test Workflow',
      [{ id: 'task-1', title: 'Task 1', type: 'data', step: 'task-1', stage: 'execute' }],
      { execute: { steps: ['task-1'] } },
    );

    const result = await workflowDone(dataDir, name, 'task-1', undefined, {
      config,
      after: [{ workflow: 'design-verify', params: { story_id: 'story_id' } }],
    });

    expect(result.archived).toBe(false);
    expect(result.awaitingAfter).toEqual([{ workflow: 'design-verify', params: { story_id: 'story_id' } }]);

    // workflow still in changes/, status awaiting-after
    const wf = readTasksYml(name);
    expect(wf.status).toBe('awaiting-after');
  });

  it('archives normally when after is empty', async () => {
    const name = workflowCreate(
      dataDir,
      'debo-test',
      'Test Workflow',
      [{ id: 'task-1', title: 'Task 1', type: 'data', step: 'task-1', stage: 'execute' }],
      { execute: { steps: ['task-1'] } },
    );

    const result = await workflowDone(dataDir, name, 'task-1', undefined, { config, after: [] });

    expect(result.archived).toBe(true);
    expect(result.awaitingAfter).toBeUndefined();
  });

  it('archives normally when after is absent', async () => {
    const name = workflowCreate(
      dataDir,
      'debo-test',
      'Test Workflow',
      [{ id: 'task-1', title: 'Task 1', type: 'data', step: 'task-1', stage: 'execute' }],
      { execute: { steps: ['task-1'] } },
    );

    const result = await workflowDone(dataDir, name, 'task-1', undefined, { config });

    expect(result.archived).toBe(true);
    expect(result.awaitingAfter).toBeUndefined();
  });

  it('archives normally when children are already registered', async () => {
    const name = workflowCreate(
      dataDir,
      'debo-test',
      'Test Workflow',
      [{ id: 'task-1', title: 'Task 1', type: 'data', step: 'task-1', stage: 'execute' }],
      { execute: { steps: ['task-1'] } },
    );

    // Pre-populate children to simulate Task 4 having already registered them
    const changesPath = resolve(dataDir, 'workflows', 'changes', name, 'tasks.yml');
    const existing = parseYaml(readFileSync(changesPath, 'utf-8')) as WorkflowFile;
    existing.children = [{ name: 'child-wf-123', workflow: 'design-verify' }];
    const { writeFileSync } = await import('node:fs');
    const { dump: dumpYaml } = await import('js-yaml');
    writeFileSync(changesPath, dumpYaml(existing));

    const result = await workflowDone(dataDir, name, 'task-1', undefined, {
      config,
      after: [{ workflow: 'design-verify', params: { story_id: 'story_id' } }],
    });

    expect(result.archived).toBe(true);
    expect(result.awaitingAfter).toBeUndefined();
  });

  it('transition-archive path: sets awaiting-after when last task of multi-stage workflow completes', async () => {
    // Two tasks in separate stages: completing execute-task completes the execute stage,
    // which triggers the stage-transition walk. The direct engine fires archive: true
    // at onTransition('finalizing', 'done') — this is the transition-archive guard (site 1).
    const name = workflowCreate(
      dataDir,
      'debo-test',
      'Test Workflow',
      [
        { id: 'execute-task', title: 'Execute Task', type: 'data', step: 'execute-task', stage: 'execute' },
        { id: 'test-task', title: 'Test Task', type: 'data', step: 'test-task', stage: 'test' },
      ],
      { execute: { steps: ['execute-task'] }, test: { steps: ['test-task'] } },
    );

    // Complete the execute-task (mid-workflow — does NOT complete the workflow)
    const midResult = await workflowDone(dataDir, name, 'execute-task', undefined, {
      config,
      after: [{ workflow: 'design-verify', params: { story_id: 'story_id' } }],
    });
    // execute stage is done, but test stage is pending — no archive yet
    expect(midResult.archived).toBe(false);
    expect(midResult.awaitingAfter).toBeUndefined();

    // Complete the test-task — now all tasks done; transitions walk through
    // committed → finalizing → done, hitting the transition-archive guard
    const result = await workflowDone(dataDir, name, 'test-task', undefined, {
      config,
      after: [{ workflow: 'design-verify', params: { story_id: 'story_id' } }],
    });

    expect(result.archived).toBe(false);
    expect(result.awaitingAfter).toEqual([{ workflow: 'design-verify', params: { story_id: 'story_id' } }]);

    const wf = readTasksYml(name);
    expect(wf.status).toBe('awaiting-after');
  });
});
