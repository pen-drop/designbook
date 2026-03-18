import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import {
  workflowCreate,
  workflowList,
  workflowAddFile,
  workflowDone,
  workflowValidate,
  type WorkflowFile,
} from '../../workflow.js';

function tasksYmlPath(dist: string, name: string): string {
  return resolve(dist, 'workflows', 'changes', name, 'tasks.yml');
}

function readWorkflowFile(dist: string, name: string): WorkflowFile {
  return parseYaml(readFileSync(tasksYmlPath(dist, name), 'utf-8')) as WorkflowFile;
}

// ── workflowCreate ───────────────────────────────────────────────────────────

describe('workflowCreate', () => {
  let dist: string;

  beforeEach(() => {
    dist = mkdtempSync(resolve(tmpdir(), 'wf-create-'));
  });

  it('returns a name matching {workflowId}-{date}-{hex}', () => {
    const name = workflowCreate(dist, 'debo-vision', 'Vision', []);
    expect(name).toMatch(/^debo-vision-\d{4}-\d{2}-\d{2}-[0-9a-f]{4}$/);
  });

  it('creates tasks.yml under workflows/changes/{name}/', () => {
    const name = workflowCreate(dist, 'debo-shell', 'Shell', []);
    expect(existsSync(tasksYmlPath(dist, name))).toBe(true);
  });

  it('writes correct title, workflow, and status', () => {
    const name = workflowCreate(dist, 'debo-vision', 'My Vision', []);
    const data = readWorkflowFile(dist, name);
    expect(data.title).toBe('My Vision');
    expect(data.workflow).toBe('debo-vision');
    expect(data.status).toBe('planning');
  });

  it('creates tasks with pending status and no timestamps', () => {
    const name = workflowCreate(dist, 'debo-vision', 'Vision', [{ id: 'task-a', title: 'Task A', type: 'component' }]);
    const data = readWorkflowFile(dist, name);
    expect(data.tasks).toHaveLength(1);
    const task = data.tasks[0];
    expect(task.id).toBe('task-a');
    expect(task.status).toBe('pending');
    expect(task.completed_at).toBeUndefined();
  });

  it('records declared files with requires_validation:true', () => {
    const name = workflowCreate(dist, 'debo-vision', 'Vision', [
      { id: 'task-a', title: 'Task A', type: 'component', files: ['components/button.component.yml'] },
    ]);
    const data = readWorkflowFile(dist, name);
    const files = data.tasks[0].files ?? [];
    expect(files).toHaveLength(1);
    expect(files[0].requires_validation).toBe(true);
  });

  it('creates multiple tasks in order', () => {
    const name = workflowCreate(dist, 'debo-vision', 'Vision', [
      { id: 'alpha', title: 'Alpha', type: 'data' },
      { id: 'beta', title: 'Beta', type: 'tokens' },
    ]);
    const data = readWorkflowFile(dist, name);
    expect(data.tasks.map((t) => t.id)).toEqual(['alpha', 'beta']);
  });
});

// ── workflowList ─────────────────────────────────────────────────────────────

describe('workflowList', () => {
  let dist: string;

  beforeEach(() => {
    dist = mkdtempSync(resolve(tmpdir(), 'wf-list-'));
  });

  it('returns empty array when changes dir does not exist', () => {
    expect(workflowList(dist, 'debo-vision')).toEqual([]);
  });

  it('returns only entries matching the given workflowId prefix', () => {
    workflowCreate(dist, 'debo-vision', 'Vision 1', []);
    workflowCreate(dist, 'debo-vision', 'Vision 2', []);
    workflowCreate(dist, 'debo-shell', 'Shell', []);

    const results = workflowList(dist, 'debo-vision');
    expect(results).toHaveLength(2);
    expect(results.every((n) => n.startsWith('debo-vision-'))).toBe(true);
  });

  it('returns results newest-first (sorted descending)', () => {
    // Create the dirs manually to control names
    const older = 'debo-vision-2026-01-01-aaaa';
    const newer = 'debo-vision-2026-03-01-bbbb';
    for (const n of [older, newer]) {
      mkdirSync(resolve(dist, 'workflows', 'changes', n), { recursive: true });
      writeFileSync(
        resolve(dist, 'workflows', 'changes', n, 'tasks.yml'),
        'title: t\nworkflow: debo-vision\nstarted_at: ""\ntasks: []',
      );
    }

    const results = workflowList(dist, 'debo-vision');
    expect(results[0]).toBe(newer);
    expect(results[1]).toBe(older);
  });
});

// ── workflowAddFile ──────────────────────────────────────────────────────────

describe('workflowAddFile', () => {
  let dist: string;
  let name: string;

  beforeEach(() => {
    dist = mkdtempSync(resolve(tmpdir(), 'wf-addfile-'));
    name = workflowCreate(dist, 'debo-vision', 'Vision', [{ id: 'task1', title: 'Task 1', type: 'component' }]);
  });

  it('adds a file to the task', () => {
    workflowAddFile(dist, name, 'task1', 'components/button.component.yml');
    const data = readWorkflowFile(dist, name);
    expect(data.tasks[0].files).toHaveLength(1);
    expect(data.tasks[0].files![0].requires_validation).toBe(true);
  });

  it('does not add duplicate files', () => {
    workflowAddFile(dist, name, 'task1', 'components/button.component.yml');
    workflowAddFile(dist, name, 'task1', 'components/button.component.yml');
    const data = readWorkflowFile(dist, name);
    expect(data.tasks[0].files).toHaveLength(1);
  });

  it('transitions status from planning to running', () => {
    workflowAddFile(dist, name, 'task1', 'components/button.component.yml');
    const data = readWorkflowFile(dist, name);
    expect(data.status).toBe('running');
  });

  it('throws when task id does not exist', () => {
    expect(() => workflowAddFile(dist, name, 'nonexistent', 'file.yml')).toThrow('Task not found: nonexistent');
  });

  it('throws when workflow does not exist', () => {
    expect(() => workflowAddFile(dist, 'debo-vision-9999-01-01-xxxx', 'task1', 'f.yml')).toThrow('Workflow not found');
  });
});

// ── workflowDone ─────────────────────────────────────────────────────────────

describe('workflowDone', () => {
  let dist: string;
  let name: string;

  beforeEach(() => {
    dist = mkdtempSync(resolve(tmpdir(), 'wf-done-'));
  });

  it('marks a task done when it has no files', () => {
    name = workflowCreate(dist, 'debo-vision', 'Vision', [
      { id: 'task1', title: 'Task 1', type: 'component' },
      { id: 'task2', title: 'Task 2', type: 'data' },
    ]);
    const result = workflowDone(dist, name, 'task1');
    expect(result.archived).toBe(false);
    expect(result.data.tasks[0].status).toBe('done');
    expect(result.data.tasks[0].completed_at).toBeTruthy();
  });

  it('archives workflow when all tasks are done', () => {
    name = workflowCreate(dist, 'debo-vision', 'Vision', [{ id: 'task1', title: 'Task 1', type: 'component' }]);
    const result = workflowDone(dist, name, 'task1');
    expect(result.archived).toBe(true);
    expect(result.data.status).toBe('completed');
    expect(result.data.completed_at).toBeTruthy();
    expect(result.data.summary).toContain('Task 1');
    // should be moved to archive directory
    expect(existsSync(resolve(dist, 'workflows', 'archive', name))).toBe(true);
    expect(existsSync(resolve(dist, 'workflows', 'changes', name))).toBe(false);
  });

  it('throws when task id is unknown', () => {
    name = workflowCreate(dist, 'debo-vision', 'Vision', [{ id: 'task1', title: 'Task 1', type: 'component' }]);
    expect(() => workflowDone(dist, name, 'nope')).toThrow('Task not found: nope');
  });

  it('throws when task is already done', () => {
    name = workflowCreate(dist, 'debo-vision', 'Vision', [
      { id: 'task1', title: 'T1', type: 'component' },
      { id: 'task2', title: 'T2', type: 'data' },
    ]);
    workflowDone(dist, name, 'task1');
    expect(() => workflowDone(dist, name, 'task1')).toThrow('already done');
  });

  it('throws when a file still requires_validation', () => {
    name = workflowCreate(dist, 'debo-vision', 'Vision', [
      { id: 'task1', title: 'T1', type: 'component', files: ['components/button.component.yml'] },
    ]);
    expect(() => workflowDone(dist, name, 'task1')).toThrow('not yet validated');
  });

  it('throws when a file failed validation', () => {
    name = workflowCreate(dist, 'debo-vision', 'Vision', [{ id: 'task1', title: 'T1', type: 'component' }]);
    // Manually inject a failed validation_result
    const filePath = tasksYmlPath(dist, name);
    const raw = parseYaml(readFileSync(filePath, 'utf-8')) as WorkflowFile;
    raw.tasks[0].files = [
      {
        path: 'components/button.component.yml',
        requires_validation: false,
        validation_result: {
          file: 'components/button.component.yml',
          type: 'component',
          valid: false,
          error: 'Missing required field',
          last_validated: new Date().toISOString(),
        },
      },
    ];
    writeFileSync(filePath, stringifyYaml(raw));
    expect(() => workflowDone(dist, name, 'task1')).toThrow('failed validation');
  });

  it('succeeds when all files are validated and passed', () => {
    name = workflowCreate(dist, 'debo-vision', 'Vision', [{ id: 'task1', title: 'T1', type: 'component' }]);
    const filePath = tasksYmlPath(dist, name);
    const raw = parseYaml(readFileSync(filePath, 'utf-8')) as WorkflowFile;
    raw.tasks[0].files = [
      {
        path: 'components/button.component.yml',
        requires_validation: false,
        validation_result: {
          file: 'components/button.component.yml',
          type: 'component',
          valid: true,
          last_validated: new Date().toISOString(),
        },
      },
    ];
    writeFileSync(filePath, stringifyYaml(raw));
    const result = workflowDone(dist, name, 'task1');
    expect(result.archived).toBe(true);
  });
});

// ── workflowValidate ─────────────────────────────────────────────────────────

describe('workflowValidate', () => {
  let dist: string;
  let name: string;

  beforeEach(() => {
    dist = mkdtempSync(resolve(tmpdir(), 'wf-validate-'));
  });

  function makeValidateFn(valid = true) {
    return async (file: string) => ({
      file,
      type: 'component',
      valid,
      error: valid ? undefined : 'Schema error',
      last_validated: new Date().toISOString(),
    });
  }

  it('returns empty results when no tasks have files', async () => {
    name = workflowCreate(dist, 'debo-vision', 'Vision', [{ id: 'task1', title: 'T1', type: 'component' }]);
    const results = await workflowValidate(dist, name, makeValidateFn());
    expect(results).toHaveLength(0);
  });

  it('calls validateFn for each declared file and stores results', async () => {
    // Create a real file so existsSync resolves it
    const fileDir = resolve(dist, 'components');
    mkdirSync(fileDir, { recursive: true });
    writeFileSync(resolve(fileDir, 'button.component.yml'), 'name: button');

    name = workflowCreate(dist, 'debo-vision', 'Vision', [
      { id: 'task1', title: 'T1', type: 'component', files: ['components/button.component.yml'] },
    ]);
    const results = await workflowValidate(dist, name, makeValidateFn(true));
    expect(results).toHaveLength(1);
    expect(results[0].valid).toBe(true);
    expect(results[0].task).toBe('task1');
  });

  it('clears requires_validation flag after validating', async () => {
    const fileDir = resolve(dist, 'components');
    mkdirSync(fileDir, { recursive: true });
    writeFileSync(resolve(fileDir, 'button.component.yml'), 'name: button');

    name = workflowCreate(dist, 'debo-vision', 'Vision', [
      { id: 'task1', title: 'T1', type: 'component', files: ['components/button.component.yml'] },
    ]);
    await workflowValidate(dist, name, makeValidateFn(true));

    const data = readWorkflowFile(dist, name);
    const f = data.tasks[0].files![0];
    expect(f.requires_validation).toBe(false);
    expect(f.validation_result?.valid).toBe(true);
  });

  it('transitions status from planning to running', async () => {
    name = workflowCreate(dist, 'debo-vision', 'Vision', [{ id: 'task1', title: 'T1', type: 'component' }]);
    await workflowValidate(dist, name, makeValidateFn());
    const data = readWorkflowFile(dist, name);
    expect(data.status).toBe('running');
  });

  it('scopes to a specific task when taskId provided', async () => {
    const fileDir = resolve(dist, 'components');
    mkdirSync(fileDir, { recursive: true });
    writeFileSync(resolve(fileDir, 'a.component.yml'), 'name: a');
    writeFileSync(resolve(fileDir, 'b.component.yml'), 'name: b');

    const calls: string[] = [];
    name = workflowCreate(dist, 'debo-vision', 'Vision', [
      { id: 'task1', title: 'T1', type: 'component', files: ['components/a.component.yml'] },
      { id: 'task2', title: 'T2', type: 'component', files: ['components/b.component.yml'] },
    ]);

    const validateFn = async (file: string) => {
      calls.push(file);
      return { file, type: 'component', valid: true, last_validated: '' };
    };

    await workflowValidate(dist, name, validateFn, 'task1');
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain('a.component.yml');
  });

  it('throws when scoped taskId does not exist', async () => {
    name = workflowCreate(dist, 'debo-vision', 'Vision', [{ id: 'task1', title: 'T1', type: 'component' }]);
    await expect(workflowValidate(dist, name, makeValidateFn(), 'nonexistent')).rejects.toThrow('Task not found');
  });

  it('stores failed validation results', async () => {
    const fileDir = resolve(dist, 'components');
    mkdirSync(fileDir, { recursive: true });
    writeFileSync(resolve(fileDir, 'bad.component.yml'), 'invalid: yaml: content');

    name = workflowCreate(dist, 'debo-vision', 'Vision', [
      { id: 'task1', title: 'T1', type: 'component', files: ['components/bad.component.yml'] },
    ]);

    const results = await workflowValidate(dist, name, makeValidateFn(false));
    expect(results[0].valid).toBe(false);

    const data = readWorkflowFile(dist, name);
    expect(data.tasks[0].files![0].validation_result?.valid).toBe(false);
  });
});
