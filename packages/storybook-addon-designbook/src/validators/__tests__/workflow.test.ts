import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, existsSync, statSync, utimesSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { load as parseYaml, dump as stringifyYaml } from 'js-yaml';
import {
  workflowCreate,
  workflowPlan,
  workflowList,
  workflowDone,
  expandTasksFromParams,
  type WorkflowFile,
} from '../../workflow.js';
import type { ResolvedStep } from '../../workflow-resolve.js';

vi.mock('node:child_process', () => ({
  execFileSync: vi.fn(),
}));

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
    expect(data.status).toBe('running');
  });

  it('creates first task with in-progress status and started_at', () => {
    const name = workflowCreate(dist, 'debo-vision', 'Vision', [{ id: 'task-a', title: 'Task A', type: 'component' }]);
    const data = readWorkflowFile(dist, name);
    expect(data.tasks).toHaveLength(1);
    const task = data.tasks[0]!;
    expect(task.id).toBe('task-a');
    expect(task.status).toBe('in-progress');
    expect(task.started_at).toBeDefined();
    expect(task.completed_at).toBeUndefined();
  });

  it('creates subsequent tasks with pending status', () => {
    const name = workflowCreate(dist, 'debo-vision', 'Vision', [
      { id: 'task-a', title: 'Task A', type: 'component' },
      { id: 'task-b', title: 'Task B', type: 'component' },
    ]);
    const data = readWorkflowFile(dist, name);
    expect(data.tasks[0]!.status).toBe('in-progress');
    expect(data.tasks[1]!.status).toBe('pending');
  });

  it('records declared files with key and validators', () => {
    const name = workflowCreate(dist, 'debo-vision', 'Vision', [
      {
        id: 'task-a',
        title: 'Task A',
        type: 'component',
        files: [{ path: `${dist}/components/button.component.yml`, key: 'component', validators: ['component'] }],
      },
    ]);
    const data = readWorkflowFile(dist, name);
    const files = data.tasks[0]!.files ?? [];
    expect(files).toHaveLength(1);
    expect(files[0]!.key).toBe('component');
    expect(files[0]!.validators).toEqual(['component']);
    // No validation_result yet (file not written)
    expect(files[0]!.validation_result).toBeUndefined();
  });

  it('creates multiple tasks in order', () => {
    const name = workflowCreate(dist, 'debo-vision', 'Vision', [
      { id: 'alpha', title: 'Alpha', type: 'data' },
      { id: 'beta', title: 'Beta', type: 'tokens' },
    ]);
    const data = readWorkflowFile(dist, name);
    expect(data.tasks.map((t) => t.id)).toEqual(['alpha', 'beta']);
  });

  it('writes parent field when provided', () => {
    const name = workflowCreate(dist, 'debo-tokens', 'Tokens', [], undefined, 'debo-design-component-2026-03-18-a3f7');
    const data = readWorkflowFile(dist, name);
    expect(data.parent).toBe('debo-design-component-2026-03-18-a3f7');
  });

  it('does not write parent field when omitted', () => {
    const name = workflowCreate(dist, 'debo-vision', 'Vision', []);
    const data = readWorkflowFile(dist, name);
    expect(data.parent).toBeUndefined();
  });

  it('creates running workflow with empty tasks', () => {
    const name = workflowCreate(dist, 'debo-vision', 'Vision', []);
    const data = readWorkflowFile(dist, name);
    expect(data.status).toBe('running');
    expect(data.tasks).toHaveLength(0);
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

// ── workflowList --include-archived ──────────────────────────────────────────

describe('workflowList with includeArchived', () => {
  let dist: string;

  beforeEach(() => {
    dist = mkdtempSync(resolve(tmpdir(), 'wf-list-archived-'));
  });

  it('returns only active when includeArchived is false', () => {
    workflowCreate(dist, 'debo-vision', 'Vision', []);
    const archiveDir = resolve(dist, 'workflows', 'archive', 'debo-vision-2025-01-01-aaaa');
    mkdirSync(archiveDir, { recursive: true });
    writeFileSync(resolve(archiveDir, 'tasks.yml'), 'title: t\nworkflow: debo-vision\nstarted_at: ""\ntasks: []');

    const results = workflowList(dist, 'debo-vision', false);
    expect(results).toHaveLength(1);
    expect(results[0]).not.toBe('debo-vision-2025-01-01-aaaa');
  });

  it('returns active + archived when includeArchived is true', () => {
    workflowCreate(dist, 'debo-vision', 'Vision', []);
    const archiveDir = resolve(dist, 'workflows', 'archive', 'debo-vision-2025-01-01-aaaa');
    mkdirSync(archiveDir, { recursive: true });
    writeFileSync(resolve(archiveDir, 'tasks.yml'), 'title: t\nworkflow: debo-vision\nstarted_at: ""\ntasks: []');

    const results = workflowList(dist, 'debo-vision', true);
    expect(results).toHaveLength(2);
    expect(results.some((n) => n === 'debo-vision-2025-01-01-aaaa')).toBe(true);
  });

  it('returns empty when workflow never run and includeArchived is true', () => {
    expect(workflowList(dist, 'debo-never', true)).toEqual([]);
  });

  it('does not include archived by default', () => {
    const archiveDir = resolve(dist, 'workflows', 'archive', 'debo-vision-2025-01-01-aaaa');
    mkdirSync(archiveDir, { recursive: true });
    writeFileSync(resolve(archiveDir, 'tasks.yml'), 'title: t\nworkflow: debo-vision\nstarted_at: ""\ntasks: []');

    const results = workflowList(dist, 'debo-vision');
    expect(results).toHaveLength(0);
  });
});

// ── workflowPlan ──────────────────────────────────────────────────────────────

describe('workflowPlan', () => {
  let dist: string;

  beforeEach(() => {
    dist = mkdtempSync(resolve(tmpdir(), 'wf-plan-'));
  });

  it('adds tasks to a running workflow and sets first to in-progress', () => {
    const name = workflowCreate(dist, 'debo-vision', 'Vision', []);
    workflowPlan(dist, name, [{ id: 'task1', title: 'Task 1', type: 'data' }]);
    const data = readWorkflowFile(dist, name);
    expect(data.tasks).toHaveLength(1);
    expect(data.tasks[0]!.id).toBe('task1');
    expect(data.tasks[0]!.status).toBe('in-progress');
  });

  it('sets stages when provided', () => {
    const name = workflowCreate(dist, 'debo-vision', 'Vision', []);
    workflowPlan(dist, name, [], { execute: { steps: ['dialog', 'create-tokens'] } });
    const data = readWorkflowFile(dist, name);
    expect(data.stages).toEqual({ execute: { steps: ['dialog', 'create-tokens'] } });
  });

  it('keeps status as running after plan', () => {
    const name = workflowCreate(dist, 'debo-vision', 'Vision', []);
    workflowPlan(dist, name, [{ id: 'task1', title: 'T1', type: 'data' }]);
    const data = readWorkflowFile(dist, name);
    expect(data.status).toBe('running');
  });
});

// ── workflowDone ─────────────────────────────────────────────────────────────

describe('workflowDone', () => {
  let dist: string;
  let name: string;

  beforeEach(() => {
    dist = mkdtempSync(resolve(tmpdir(), 'wf-done-'));
  });

  it('marks a task done when it has no files', async () => {
    name = workflowCreate(
      dist,
      'debo-vision',
      'Vision',
      [
        { id: 'task1', title: 'Task 1', type: 'component', step: 'do-task1', stage: 'execute' },
        { id: 'task2', title: 'Task 2', type: 'data', step: 'do-task2', stage: 'execute' },
      ],
      { execute: { steps: ['do-task1', 'do-task2'] } },
    );
    const result = await await workflowDone(dist, name, 'task1');
    expect(result.archived).toBe(false);
    expect(result.data.tasks[0]!.status).toBe('done');
    expect(result.data.tasks[0]!.completed_at).toBeTruthy();
  });

  it('archives workflow when all tasks are done', async () => {
    name = workflowCreate(
      dist,
      'debo-vision',
      'Vision',
      [{ id: 'task1', title: 'Task 1', type: 'component', step: 'do-task', stage: 'execute' }],
      { execute: { steps: ['do-task'] } },
    );
    const result = await await workflowDone(dist, name, 'task1');
    expect(result.archived).toBe(true);
    expect(result.data.status).toBe('completed');
    expect(result.data.completed_at).toBeTruthy();
    expect(result.data.summary).toContain('Task 1');
    // should be moved to archive directory
    expect(existsSync(resolve(dist, 'workflows', 'archive', name))).toBe(true);
    expect(existsSync(resolve(dist, 'workflows', 'changes', name))).toBe(false);
  });

  it('throws when task id is unknown', async () => {
    name = workflowCreate(dist, 'debo-vision', 'Vision', [{ id: 'task1', title: 'Task 1', type: 'component' }]);
    await expect(() => workflowDone(dist, name, 'nope')).rejects.toThrow('Task not found: nope');
  });

  it('throws when task is already done', async () => {
    name = workflowCreate(
      dist,
      'debo-vision',
      'Vision',
      [
        { id: 'task1', title: 'T1', type: 'component', step: 'do-task1', stage: 'execute' },
        { id: 'task2', title: 'T2', type: 'data', step: 'do-task2', stage: 'execute' },
      ],
      { execute: { steps: ['do-task1', 'do-task2'] } },
    );
    await workflowDone(dist, name, 'task1');
    await expect(() => workflowDone(dist, name, 'task1')).rejects.toThrow('already done');
  });

  it('throws when a file has not been written (no validation_result)', async () => {
    name = workflowCreate(dist, 'debo-vision', 'Vision', [
      {
        id: 'task1',
        title: 'T1',
        type: 'component',
        files: [{ path: '/absolute/path/button.component.yml', key: 'component', validators: ['component'] }],
      },
    ]);
    await expect(() => workflowDone(dist, name, 'task1')).rejects.toThrow('not yet written');
  });

  it('throws when all files have unresolved placeholders and none were written', async () => {
    name = workflowCreate(dist, 'debo-vision', 'Vision', [
      {
        id: 'task1',
        title: 'T1',
        type: 'component',
        files: [{ path: 'designbook/stories/{storyId}/meta.yml', key: 'meta', validators: [] }],
      },
    ]);
    await expect(() => workflowDone(dist, name, 'task1')).rejects.toThrow('unresolved placeholders');
  });

  it('throws when a file failed validation', async () => {
    name = workflowCreate(dist, 'debo-vision', 'Vision', [{ id: 'task1', title: 'T1', type: 'component' }]);
    // Manually inject a failed validation_result
    const filePath = tasksYmlPath(dist, name);
    const raw = parseYaml(readFileSync(filePath, 'utf-8')) as WorkflowFile;
    raw.tasks[0]!.files = [
      {
        path: `${dist}/components/button.component.yml`,
        key: 'component',
        validators: ['component'],
        validation_result: {
          file: `${dist}/components/button.component.yml`,
          type: 'component',
          valid: false,
          error: 'Missing required field',
          last_validated: new Date().toISOString(),
        },
      },
    ];
    writeFileSync(filePath, stringifyYaml(raw));
    await expect(() => workflowDone(dist, name, 'task1')).rejects.toThrow('errors');
  });

  it('succeeds when all files have passing validation_result', async () => {
    name = workflowCreate(
      dist,
      'debo-vision',
      'Vision',
      [{ id: 'task1', title: 'T1', type: 'component', step: 'do-task', stage: 'execute' }],
      { execute: { steps: ['do-task'] } },
    );
    const filePath = tasksYmlPath(dist, name);
    const raw = parseYaml(readFileSync(filePath, 'utf-8')) as WorkflowFile;
    raw.tasks[0]!.files = [
      {
        path: `${dist}/components/button.component.yml`,
        key: 'component',
        validators: ['component'],
        validation_result: {
          file: `${dist}/components/button.component.yml`,
          type: 'component',
          valid: true,
          last_validated: new Date().toISOString(),
        },
      },
    ];
    writeFileSync(filePath, stringifyYaml(raw));
    const result = await await workflowDone(dist, name, 'task1');
    expect(result.archived).toBe(true);
  });

  it('does not touch task files during non-final task done (touch deferred to workflow completion)', async () => {
    // Per-task touch removed: files are touched only when the final task completes via WORKTREE commit
    name = workflowCreate(
      dist,
      'debo-vision',
      'Vision',
      [
        { id: 'task1', title: 'T1', type: 'component', step: 'do-task1', stage: 'execute' },
        { id: 'task2', title: 'T2', type: 'data', step: 'do-task2', stage: 'execute' },
      ],
      { execute: { steps: ['do-task1', 'do-task2'] } },
    );
    // Create a real file and set its mtime to the past
    const componentDir = resolve(dist, 'components');
    mkdirSync(componentDir, { recursive: true });
    const componentFile = resolve(componentDir, 'button.component.yml');
    writeFileSync(componentFile, 'name: button');
    const pastDate = new Date('2020-01-01');
    utimesSync(componentFile, pastDate, pastDate);
    const mtimeBefore = statSync(componentFile).mtimeMs;

    // Set up file with validation_result in task
    const filePath = tasksYmlPath(dist, name);
    const raw = parseYaml(readFileSync(filePath, 'utf-8')) as WorkflowFile;
    raw.tasks[0]!.files = [
      {
        path: componentFile,
        key: 'component',
        validators: ['component'],
        validation_result: {
          file: componentFile,
          type: 'component',
          valid: true,
          last_validated: new Date().toISOString(),
        },
      },
    ];
    writeFileSync(filePath, stringifyYaml(raw));

    await workflowDone(dist, name, 'task1'); // non-final task
    const mtimeAfter = statSync(componentFile).mtimeMs;
    // No touch during non-final task
    expect(mtimeAfter).toBe(mtimeBefore);
  });

  it('silently skips missing files during touch', async () => {
    name = workflowCreate(
      dist,
      'debo-vision',
      'Vision',
      [{ id: 'task1', title: 'T1', type: 'component', step: 'do-task', stage: 'execute' }],
      { execute: { steps: ['do-task'] } },
    );
    const filePath = tasksYmlPath(dist, name);
    const raw = parseYaml(readFileSync(filePath, 'utf-8')) as WorkflowFile;
    const missingFile = resolve(dist, 'nonexistent', 'missing.yml');
    const existingFile = resolve(dist, 'existing.yml');
    mkdirSync(resolve(dist), { recursive: true });
    writeFileSync(existingFile, 'test: true');
    raw.tasks[0]!.files = [
      {
        path: missingFile,
        key: 'missing',
        validators: [],
        validation_result: {
          file: missingFile,
          type: 'component',
          valid: true,
          last_validated: new Date().toISOString(),
        },
      },
      {
        path: existingFile,
        key: 'existing',
        validators: [],
        validation_result: {
          file: existingFile,
          type: 'component',
          valid: true,
          last_validated: new Date().toISOString(),
        },
      },
    ];
    writeFileSync(filePath, stringifyYaml(raw));
    // Should not throw despite missing file
    await expect(workflowDone(dist, name, 'task1')).resolves.not.toThrow();
  });
});

// ── Engine: direct ───────────────────────────────────────────────────────────

describe('workflowDone with engine: direct', () => {
  let dist: string;

  beforeEach(() => {
    dist = mkdtempSync(resolve(tmpdir(), 'wf-direct-'));
  });

  it('archives immediately when all tasks done', async () => {
    const name = workflowCreate(dist, 'debo-test', 'Test', [{ id: 'task1', title: 'T1', type: 'data' }]);
    workflowPlan(dist, name, [{ id: 'task1', title: 'T1', type: 'data', step: 'do-task', stage: 'execute' }], {
      execute: { steps: ['do-task'] },
    });

    const result = await await workflowDone(dist, name, 'task1');
    expect(result.archived).toBe(true);
    expect(result.data.status).toBe('completed');
    expect(existsSync(resolve(dist, 'workflows', 'archive', name, 'tasks.yml'))).toBe(true);
    expect(existsSync(resolve(dist, 'workflows', 'changes', name))).toBe(false);
  });

  it('does not call git operations', async () => {
    const childProcess = await import('node:child_process');
    const mock = childProcess.execFileSync as unknown as Mock;
    mock.mockClear();

    const name = workflowCreate(dist, 'debo-test', 'Test', [{ id: 'task1', title: 'T1', type: 'data' }]);
    workflowPlan(dist, name, [{ id: 'task1', title: 'T1', type: 'data', step: 'do-task', stage: 'execute' }], {
      execute: { steps: ['do-task'] },
    });

    mock.mockClear();
    await workflowDone(dist, name, 'task1');
    expect(mock).not.toHaveBeenCalled();
  });
});

// ── Stage-based response ────────────────────────────────────────────────────

describe('workflowDone stage-based response', () => {
  let dist: string;

  beforeEach(() => {
    dist = mkdtempSync(resolve(tmpdir(), 'wf-response-'));
  });

  it('returns next_step when more steps remain in same stage', async () => {
    const stages = { execute: { steps: ['create-component', 'create-scene'] } };
    const name = workflowCreate(
      dist,
      'debo-test',
      'Test',
      [
        { id: 'task1', title: 'T1', type: 'component', step: 'create-component', stage: 'execute' },
        { id: 'task2', title: 'T2', type: 'scene', step: 'create-scene', stage: 'execute' },
      ],
      stages,
    );
    // Set current_stage via plan
    workflowPlan(
      dist,
      name,
      [
        { id: 'task1', title: 'T1', type: 'component', step: 'create-component', stage: 'execute' },
        { id: 'task2', title: 'T2', type: 'scene', step: 'create-scene', stage: 'execute' },
      ],
      stages,
    );

    const result = await await workflowDone(dist, name, 'task1');
    expect(result.archived).toBe(false);
    expect(result.response).toBeDefined();
    expect(result.response!.stage).toBe('execute');
    expect(result.response!.step_completed).toBe('create-component');
    expect(result.response!.next_step).toBe('create-scene');
  });

  it('returns stage transition when last step in stage completes', async () => {
    const stages = {
      execute: { steps: ['create-component'] },
      test: { steps: ['visual-diff'] },
    };
    const name = workflowCreate(
      dist,
      'debo-test',
      'Test',
      [
        { id: 'task1', title: 'T1', type: 'component', step: 'create-component', stage: 'execute' },
        { id: 'task2', title: 'T2', type: 'test', step: 'visual-diff', stage: 'test' },
      ],
      stages,
    );
    workflowPlan(
      dist,
      name,
      [
        { id: 'task1', title: 'T1', type: 'component', step: 'create-component', stage: 'execute' },
        { id: 'task2', title: 'T2', type: 'test', step: 'visual-diff', stage: 'test' },
      ],
      stages,
    );

    const result = await await workflowDone(dist, name, 'task1');
    expect(result.response).toBeDefined();
    expect(result.response!.next_stage).toBe('test');
    expect(result.response!.next_step).toBe('visual-diff');
  });

  it('returns waiting_for when stage has unfulfilled params', async () => {
    const stages = {
      execute: { steps: ['create-component'] },
      preview: {
        steps: ['storybook-preview'],
        params: { user_approved: { type: 'boolean', prompt: 'Passt alles?' } },
      },
    };
    const name = workflowCreate(
      dist,
      'debo-test',
      'Test',
      [
        { id: 'task1', title: 'T1', type: 'component', step: 'create-component', stage: 'execute' },
        { id: 'task2', title: 'T2', type: 'validation', step: 'storybook-preview', stage: 'preview' },
      ],
      stages,
    );
    workflowPlan(
      dist,
      name,
      [
        { id: 'task1', title: 'T1', type: 'component', step: 'create-component', stage: 'execute' },
        { id: 'task2', title: 'T2', type: 'validation', step: 'storybook-preview', stage: 'preview' },
      ],
      stages,
    );

    const result = await await workflowDone(dist, name, 'task1');
    expect(result.response).toBeDefined();
    expect(result.response!.waiting_for).toBeDefined();
    expect(result.response!.waiting_for!.user_approved).toBeDefined();
    expect(result.response!.waiting_for!.user_approved!.prompt).toBe('Passt alles?');
  });

  it('direct engine archives and returns stage: done when all tasks complete', async () => {
    const stages = { execute: { steps: ['create-tokens'] } };
    const name = workflowCreate(
      dist,
      'debo-test',
      'Test',
      [{ id: 'task1', title: 'T1', type: 'tokens', step: 'create-tokens', stage: 'execute' }],
      stages,
    );
    workflowPlan(
      dist,
      name,
      [{ id: 'task1', title: 'T1', type: 'tokens', step: 'create-tokens', stage: 'execute' }],
      stages,
    );

    const result = await await workflowDone(dist, name, 'task1');
    expect(result.archived).toBe(true);
    expect(result.response).toBeDefined();
    expect(result.response!.stage).toBe('done');
  });

  it('does not leave the current stage while declared steps are still missing', async () => {
    const stages = {
      execute: { steps: ['create-component', 'create-scene'] },
      test: { steps: ['visual-diff'] },
    };
    const name = workflowCreate(
      dist,
      'debo-test',
      'Test',
      [
        { id: 'task1', title: 'T1', type: 'component', step: 'create-component', stage: 'execute' },
        { id: 'task2', title: 'T2', type: 'test', step: 'visual-diff', stage: 'test' },
      ],
      stages,
    );
    workflowPlan(
      dist,
      name,
      [
        { id: 'task1', title: 'T1', type: 'component', step: 'create-component', stage: 'execute' },
        { id: 'task2', title: 'T2', type: 'test', step: 'visual-diff', stage: 'test' },
      ],
      stages,
    );

    await expect(() => workflowDone(dist, name, 'task1')).rejects.toThrow(
      "Cannot complete stage 'execute' — step(s) not materialized: create-scene",
    );
  });

  it('allows entering the next stage when at least one declared step is materialized', async () => {
    const stages = {
      execute: { steps: ['create-component'] },
      scene: { steps: ['create-scene-file', 'create-scene'] },
    };
    const name = workflowCreate(
      dist,
      'debo-test',
      'Test',
      [
        { id: 'task1', title: 'T1', type: 'component', step: 'create-component', stage: 'execute' },
        { id: 'task2', title: 'T2', type: 'scene', step: 'create-scene-file', stage: 'scene' },
      ],
      stages,
    );
    workflowPlan(
      dist,
      name,
      [
        { id: 'task1', title: 'T1', type: 'component', step: 'create-component', stage: 'execute' },
        { id: 'task2', title: 'T2', type: 'scene', step: 'create-scene-file', stage: 'scene' },
      ],
      stages,
    );

    const result = await workflowDone(dist, name, 'task1');
    expect(result.archived).toBe(false);
    expect(result.response).toBeDefined();
    expect(result.response!.next_stage).toBe('scene');
    expect(result.response!.next_step).toBe('create-scene-file');
  });
});

// ── expandTasksFromParams: when.type filtering ─────────────────────────────

describe('expandTasksFromParams filter-condition filtering', () => {
  let taskDir: string;

  beforeEach(() => {
    taskDir = mkdtempSync(resolve(tmpdir(), 'wf-filter-type-'));

    // Task file with filter.check.type: screenshot
    writeFileSync(
      resolve(taskDir, 'capture.md'),
      [
        '---',
        'trigger:',
        '  steps: [capture]',
        'filter:',
        '  check.type: screenshot',
        'each:',
        '  check:',
        '    expr: "checks"',
        'params:',
        '  scene: { type: string }',
        '  check: { type: object }',
        'files: []',
        '---',
        '# Capture',
      ].join('\n'),
    );

    // Task file with filter.check.type: markup
    writeFileSync(
      resolve(taskDir, 'compare-markup.md'),
      [
        '---',
        'trigger:',
        '  steps: [compare]',
        'filter:',
        '  check.type: markup',
        'each:',
        '  check:',
        '    expr: "checks"',
        'params:',
        '  scene: { type: string }',
        '  check: { type: object }',
        'files: []',
        '---',
        '# Compare Markup',
      ].join('\n'),
    );

    // Task file with filter.check.type: screenshot
    writeFileSync(
      resolve(taskDir, 'compare-screenshots.md'),
      [
        '---',
        'trigger:',
        '  steps: [compare]',
        'filter:',
        '  check.type: screenshot',
        'each:',
        '  check:',
        '    expr: "checks"',
        'params:',
        '  scene: { type: string }',
        '  check: { type: object }',
        'files: []',
        '---',
        '# Compare Screenshots',
      ].join('\n'),
    );
  });

  function makeStageLoaded(): Record<string, ResolvedStep | ResolvedStep[]> {
    return {
      capture: {
        task_file: resolve(taskDir, 'capture.md'),
        rules: [],
        blueprints: [],
        config_rules: [],
        config_instructions: [],
      },
      compare: [
        {
          task_file: resolve(taskDir, 'compare-markup.md'),
          rules: [],
          blueprints: [],
          config_rules: [],
          config_instructions: [],
        },
        {
          task_file: resolve(taskDir, 'compare-screenshots.md'),
          rules: [],
          blueprints: [],
          config_rules: [],
          config_instructions: [],
        },
      ],
    };
  }

  it('filters tasks by filter.check.type — screenshot items only get screenshot tasks', async () => {
    const stages = { test: { steps: ['capture', 'compare'] } };
    const params = {
      scene: 'design-system:shell',
      checks: [
        { scene: 'design-system:shell', breakpoint: 'xl', region: 'header', type: 'screenshot' },
        { scene: 'design-system:shell', breakpoint: 'xl', region: 'markup', type: 'markup' },
      ],
    };

    const tasks = await expandTasksFromParams(makeStageLoaded(), stages, params, [], {});

    // Screenshot check should get: capture + compare-screenshots (2 tasks)
    // Markup check should get: compare-markup only (1 task, no capture)
    const screenshotTasks = tasks.filter((t) => (t.params?.check as { type: string })?.type === 'screenshot');
    const markupTasks = tasks.filter((t) => (t.params?.check as { type: string })?.type === 'markup');

    expect(screenshotTasks).toHaveLength(2);
    expect(screenshotTasks.map((t) => t.step)).toEqual(['capture', 'compare']);

    expect(markupTasks).toHaveLength(1);
    expect(markupTasks[0]!.step).toBe('compare');
    expect(markupTasks[0]!.task_file).toContain('compare-markup.md');
  });

  it('screenshot compare resolves to compare-screenshots task file', async () => {
    const stages = { test: { steps: ['compare'] } };
    const params = {
      scene: 'design-system:shell',
      checks: [{ scene: 'design-system:shell', breakpoint: 'xl', region: 'header', type: 'screenshot' }],
    };

    const tasks = await expandTasksFromParams(makeStageLoaded(), stages, params, [], {});
    expect(tasks).toHaveLength(1);
    expect(tasks[0]!.task_file).toContain('compare-screenshots.md');
  });

  it('markup compare resolves to compare-markup task file', async () => {
    const stages = { test: { steps: ['compare'] } };
    const params = {
      scene: 'design-system:shell',
      checks: [{ scene: 'design-system:shell', breakpoint: 'xl', region: 'markup', type: 'markup' }],
    };

    const tasks = await expandTasksFromParams(makeStageLoaded(), stages, params, [], {});
    expect(tasks).toHaveLength(1);
    expect(tasks[0]!.task_file).toContain('compare-markup.md');
  });

  it('filter.check.type filters before param validation — mismatched type skips task entirely', async () => {
    const stages = { test: { steps: ['capture'] } };
    const params = {
      scene: 'design-system:shell',
      checks: [{ scene: 'design-system:shell', breakpoint: 'xl', region: 'markup', type: 'markup' }],
    };

    // capture has filter.check.type: screenshot — markup item should produce zero capture tasks
    const tasks = await expandTasksFromParams(makeStageLoaded(), stages, params, [], {});
    expect(tasks).toHaveLength(0);
  });
});
