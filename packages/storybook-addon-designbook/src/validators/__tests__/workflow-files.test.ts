import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { workflowCreate, workflowUpdate } from '../../workflow.js';

interface TaskFileRaw {
  path: string;
  requires_validation?: boolean;
  validation_result?: Record<string, unknown>;
}
interface TaskRaw {
  id: string;
  files?: TaskFileRaw[];
}
interface WorkflowRaw {
  tasks: TaskRaw[];
}

describe('workflowUpdate --files', () => {
  let dist: string;

  beforeEach(() => {
    dist = mkdtempSync(resolve(tmpdir(), 'workflow-test-'));
  });

  it('stores files and sets requires_validation:true per file', () => {
    const name = workflowCreate(dist, 'test-workflow', 'Test Workflow', [
      { id: 'create-component', title: 'Create Component', type: 'component' },
    ]);

    workflowUpdate(dist, name, 'create-component', 'in-progress', [
      `${dist}/components/button/button.component.yml`,
      `${dist}/components/button/button.default.story.yml`,
    ]);

    const tasksPath = resolve(dist, 'workflows', 'changes', name, 'tasks.yml');
    const data = parseYaml(readFileSync(tasksPath, 'utf-8')) as WorkflowRaw;
    const task = data.tasks.find((t) => t.id === 'create-component');

    expect(task?.files).toHaveLength(2);
    expect(task?.files?.[0]).toEqual({
      path: `${dist}/components/button/button.component.yml`,
      requires_validation: true,
    });
    expect(task?.files?.[1]).toEqual({
      path: `${dist}/components/button/button.default.story.yml`,
      requires_validation: true,
    });
  });

  it('preserves existing validation_result when adding more files', () => {
    const name = workflowCreate(dist, 'test-workflow', 'Test', [
      { id: 'task1', title: 'Task 1', type: 'component' },
      { id: 'task2', title: 'Task 2', type: 'component' },
    ]);

    const fileAPath = `${dist}/components/button.component.yml`;
    const fileBPath = `${dist}/components/button/button.default.story.yml`;

    // First update: set file A on task1 (in-progress, not done yet)
    workflowUpdate(dist, name, 'task1', 'in-progress', [fileAPath]);

    // Manually inject a validation_result for file A
    const tasksPath = resolve(dist, 'workflows', 'changes', name, 'tasks.yml');
    const raw = parseYaml(readFileSync(tasksPath, 'utf-8')) as WorkflowRaw;
    raw.tasks[0].files![0].validation_result = {
      file: fileAPath,
      type: 'component',
      valid: true,
      last_validated: '2026-01-01T00:00:00.000Z',
    };
    raw.tasks[0].files![0].requires_validation = false;
    writeFileSync(tasksPath, stringifyYaml(raw));

    // Second update: mark done with same file A + new file B
    // File A should preserve its validation_result, file B starts fresh
    workflowUpdate(dist, name, 'task1', 'done', [fileAPath, fileBPath]);

    const data2 = parseYaml(readFileSync(tasksPath, 'utf-8')) as WorkflowRaw;
    const files = data2.tasks[0].files;
    expect(files).toHaveLength(2);

    const fileA = files?.find((f) => f.path === fileAPath);
    expect(fileA?.requires_validation).toBe(true); // re-flagged for validation
    expect(fileA?.validation_result?.valid).toBe(true); // old result preserved

    const fileB = files?.find((f) => f.path === fileBPath);
    expect(fileB?.requires_validation).toBe(true);
    expect(fileB?.validation_result).toBeUndefined(); // no prior result
  });
});
