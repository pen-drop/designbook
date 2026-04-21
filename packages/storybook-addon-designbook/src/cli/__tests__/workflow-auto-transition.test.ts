import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { dump as dumpYaml, load as parseYaml } from 'js-yaml';
import { buildInstructions } from '../workflow.js';
import { workflowCreate, workflowDone, workflowResult, type WorkflowFile } from '../../workflow.js';
import type { DesignbookConfig } from '../../config.js';

describe('waiting→running auto-transition removal', () => {
  let dataDir: string;
  let workflowName: string;
  let tasksYmlPath: string;

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), 'wf-auto-'));
    workflowName = 'test-wf-2026-04-20-abcd';
    const dir = join(dataDir, 'workflows', 'changes', workflowName);
    mkdirSync(dir, { recursive: true });
    tasksYmlPath = join(dir, 'tasks.yml');
    writeFileSync(
      tasksYmlPath,
      dumpYaml({
        title: 'Test',
        workflow: 'test-wf',
        status: 'waiting',
        waiting_message: 'Preview OK?',
        stages: { intake: { steps: ['intake'] } },
        stage_loaded: {
          intake: {
            task_file: '/abs/intake.md',
            rules: [],
            blueprints: [],
            config_rules: [],
            config_instructions: [],
          },
        },
        tasks: [{ id: 'intake', status: 'in-progress', title: 'Intake', stage: 'intake' }],
      }),
    );
  });

  afterEach(() => rmSync(dataDir, { recursive: true, force: true }));

  it('buildInstructions does NOT flip waiting→running', () => {
    buildInstructions(dataDir, workflowName, 'intake');
    const raw = parseYaml(readFileSync(tasksYmlPath, 'utf-8')) as {
      status: string;
      waiting_message?: string;
    };
    expect(raw.status).toBe('waiting');
    expect(raw.waiting_message).toBe('Preview OK?');
  });

  // ── library functions: workflowResult + workflowDone ─────────────────────

  function readTasksYml(path: string): WorkflowFile {
    return parseYaml(readFileSync(path, 'utf-8')) as WorkflowFile;
  }

  function writeTasksYml(path: string, data: WorkflowFile): void {
    writeFileSync(path, dumpYaml(data));
  }

  it('workflowResult --json (data) does NOT flip waiting→running', async () => {
    // Arrange: create a workflow with a task that declares a data result,
    // then flip it to `waiting` to simulate a suspended workflow.
    const name = workflowCreate(
      dataDir,
      'debo-test',
      'Test Workflow',
      [
        {
          id: 'task-1',
          title: 'Task 1',
          type: 'data',
          step: 'task-1',
          stage: 'execute',
          result: {
            checks: { schema: { type: 'array' } },
          },
        },
      ],
      { execute: { steps: ['task-1'] } },
    );

    const filePath = resolve(dataDir, 'workflows', 'changes', name, 'tasks.yml');
    const data = readTasksYml(filePath);
    data.status = 'waiting';
    data.waiting_message = 'Preview OK?';
    writeTasksYml(filePath, data);

    const config: DesignbookConfig = { data: dataDir, technology: 'html', extensions: [] };

    // Act: submit a data result (exercises the 1709 path — "data result")
    const result = await workflowResult(dataDir, name, 'task-1', 'checks', [1, 2, 3], config);
    expect(result.valid).toBe(true);

    // Assert: status still waiting, waiting_message preserved
    const after = readTasksYml(filePath);
    expect(after.status).toBe('waiting');
    expect(after.waiting_message).toBe('Preview OK?');
  });

  it('workflowDone does NOT flip waiting→running', async () => {
    // Arrange: create a workflow with TWO tasks in the same stage so that
    // marking the first done does NOT complete the stage (and does not archive).
    // That keeps the file in changes/ and exercises the mid-stage write path,
    // where the 1161 auto-transition block lives.
    const name = workflowCreate(
      dataDir,
      'debo-test',
      'Test Workflow',
      [
        { id: 'task-1', title: 'Task 1', type: 'data', step: 'task-1', stage: 'execute' },
        { id: 'task-2', title: 'Task 2', type: 'data', step: 'task-2', stage: 'execute' },
      ],
      { execute: { steps: ['task-1', 'task-2'] } },
    );

    const changesPath = resolve(dataDir, 'workflows', 'changes', name, 'tasks.yml');
    const data = readTasksYml(changesPath);
    data.status = 'waiting';
    data.waiting_message = 'Preview OK?';
    writeTasksYml(changesPath, data);

    // Act: mark the first task done (exercises the 1161 path in workflowDone)
    const result = await workflowDone(dataDir, name, 'task-1');
    expect(result.archived).toBe(false);

    // Assert: status still waiting, waiting_message preserved
    const finalPath = existsSync(changesPath)
      ? changesPath
      : resolve(dataDir, 'workflows', 'archive', name, 'tasks.yml');
    const after = readTasksYml(finalPath);
    expect(after.status).toBe('waiting');
    expect(after.waiting_message).toBe('Preview OK?');
  });
});
