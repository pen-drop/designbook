import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { load as parseYaml } from 'js-yaml';
import { workflowCreate } from '../../workflow.js';

interface TaskFileRaw {
  path: string;
  key: string;
  validators: string[];
  validation_result?: Record<string, unknown>;
}
interface TaskRaw {
  id: string;
  files?: TaskFileRaw[];
}
interface WorkflowRaw {
  tasks: TaskRaw[];
}

describe('workflowCreate --files (structured format)', () => {
  let dist: string;

  beforeEach(() => {
    dist = mkdtempSync(resolve(tmpdir(), 'workflow-test-'));
  });

  it('stores files with key and validators fields', () => {
    const name = workflowCreate(dist, 'test-workflow', 'Test Workflow', [
      {
        id: 'create-component',
        title: 'Create Component',
        type: 'component',
        files: [
          { path: `${dist}/components/button/button.component.yml`, key: 'component', validators: ['component'] },
          { path: `${dist}/components/button/button.default.story.yml`, key: 'story', validators: ['scene'] },
        ],
      },
    ]);

    const tasksPath = resolve(dist, 'workflows', 'changes', name, 'tasks.yml');
    const data = parseYaml(readFileSync(tasksPath, 'utf-8')) as WorkflowRaw;
    const task = data.tasks.find((t) => t.id === 'create-component');

    expect(task?.files).toHaveLength(2);
    expect(task?.files?.[0]).toEqual({
      path: `${dist}/components/button/button.component.yml`,
      key: 'component',
      validators: ['component'],
    });
    expect(task?.files?.[1]).toEqual({
      path: `${dist}/components/button/button.default.story.yml`,
      key: 'story',
      validators: ['scene'],
    });
  });

  it('files start without validation_result (not yet written)', () => {
    const name = workflowCreate(dist, 'test-workflow', 'Test', [
      {
        id: 'task1',
        title: 'Task 1',
        type: 'component',
        files: [{ path: `${dist}/components/button.component.yml`, key: 'component', validators: ['component'] }],
      },
    ]);

    const tasksPath = resolve(dist, 'workflows', 'changes', name, 'tasks.yml');
    const data = parseYaml(readFileSync(tasksPath, 'utf-8')) as WorkflowRaw;
    const file = data.tasks[0]!.files![0]!;

    // No validation_result means file has not been written yet
    expect(file.validation_result).toBeUndefined();
  });

  it('stores files with empty validators array', () => {
    const name = workflowCreate(dist, 'test-workflow', 'Test', [
      {
        id: 'task1',
        title: 'Task 1',
        type: 'data',
        files: [{ path: `${dist}/data/model.yml`, key: 'data-model', validators: [] }],
      },
    ]);

    const tasksPath = resolve(dist, 'workflows', 'changes', name, 'tasks.yml');
    const data = parseYaml(readFileSync(tasksPath, 'utf-8')) as WorkflowRaw;
    const file = data.tasks[0]!.files![0]!;

    expect(file.key).toBe('data-model');
    expect(file.validators).toEqual([]);
  });
});
