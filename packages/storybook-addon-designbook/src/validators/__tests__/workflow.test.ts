import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, existsSync, statSync, utimesSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { load as parseYaml, dump as stringifyYaml } from 'js-yaml';
import {
  workflowCreate,
  workflowPlan,
  workflowList,
  workflowDone,
  workflowMerge,
  isGitRepo,
  createGitWorktree,
  checkPreflightClean,
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

  it('stores write_root and workspace_root when provided', () => {
    const name = workflowCreate(dist, 'debo-vision', 'Vision', []);
    const writeRoot = join(dist, 'worktree');
    const rootDir = join(dist, 'root');
    workflowPlan(dist, name, [], undefined, undefined, writeRoot, rootDir);
    const data = readWorkflowFile(dist, name);
    expect(data.write_root).toBe(writeRoot);
    expect(data.workspace_root).toBe(rootDir);
  });

  it('does not write write_root when not provided', () => {
    const name = workflowCreate(dist, 'debo-vision', 'Vision', []);
    workflowPlan(dist, name, []);
    const data = readWorkflowFile(dist, name);
    expect(data.write_root).toBeUndefined();
    expect(data.workspace_root).toBeUndefined();
  });
});

// ── WORKTREE: workflowDone bulk copy + touch + cleanup ────────────────────────

describe('workflowDone with WORKTREE', () => {
  let dist: string;
  let rootDir: string;
  let writeRoot: string;

  beforeEach(() => {
    dist = mkdtempSync(resolve(tmpdir(), 'wf-worktree-'));
    rootDir = resolve(dist, 'project-root');
    writeRoot = resolve(dist, 'worktree');
    mkdirSync(rootDir, { recursive: true });
    mkdirSync(writeRoot, { recursive: true });
  });

  it('non-final task: no copy, no WORKTREE removal', async () => {
    const fileA = resolve(writeRoot, 'file-a.yml');
    const fileB = resolve(writeRoot, 'file-b.yml');
    writeFileSync(fileA, 'a: 1');
    writeFileSync(fileB, 'b: 2');

    const name = workflowCreate(dist, 'debo-test', 'Test', [
      {
        id: 'task1',
        title: 'T1',
        type: 'data',
        step: 'do-task1',
        stage: 'execute',
        files: [{ path: fileA, key: 'file-a', validators: [] }],
      },
      {
        id: 'task2',
        title: 'T2',
        type: 'data',
        step: 'do-task2',
        stage: 'execute',
        files: [{ path: fileB, key: 'file-b', validators: [] }],
      },
    ]);
    workflowPlan(
      dist,
      name,
      [
        {
          id: 'task1',
          title: 'T1',
          type: 'data',
          step: 'do-task1',
          stage: 'execute',
          files: [{ path: fileA, key: 'file-a', validators: [] }],
        },
        {
          id: 'task2',
          title: 'T2',
          type: 'data',
          step: 'do-task2',
          stage: 'execute',
          files: [{ path: fileB, key: 'file-b', validators: [] }],
        },
      ],
      { execute: { steps: ['do-task1', 'do-task2'] } },
      undefined,
      writeRoot,
      rootDir,
    );

    // Manually mark task1's file as written+validated
    const data = readWorkflowFile(dist, name);
    data.tasks[0]!.files![0]!.validation_result = { file: fileA, type: 'data', valid: true, last_validated: '' };
    writeFileSync(tasksYmlPath(dist, name), stringifyYaml(data));

    const result = await await workflowDone(dist, name, 'task1');
    expect(result.archived).toBe(false);

    // WORKTREE still exists (not yet committed)
    expect(existsSync(writeRoot)).toBe(true);
    // Files not yet in rootDir
    expect(existsSync(resolve(rootDir, 'file-a.yml'))).toBe(false);
  });

  it('final task without write_root: archives immediately (direct engine behavior)', async () => {
    const realFile = resolve(rootDir, 'data.yml');
    writeFileSync(realFile, 'real: true');

    const name = workflowCreate(dist, 'debo-test', 'Test', [
      {
        id: 'task1',
        title: 'T1',
        type: 'data',
        step: 'do-task',
        stage: 'execute',
        files: [{ path: realFile, key: 'data', validators: [] }],
      },
    ]);
    workflowPlan(
      dist,
      name,
      [
        {
          id: 'task1',
          title: 'T1',
          type: 'data',
          step: 'do-task',
          stage: 'execute',
          files: [{ path: realFile, key: 'data', validators: [] }],
        },
      ],
      { execute: { steps: ['do-task'] } },
    ); // no write_root, no engine → defaults to archive path

    const data = readWorkflowFile(dist, name);
    data.tasks[0]!.files![0]!.validation_result = { file: realFile, type: 'data', valid: true, last_validated: '' };
    writeFileSync(tasksYmlPath(dist, name), stringifyYaml(data));

    const result = await await workflowDone(dist, name, 'task1');
    expect(result.archived).toBe(true);
    // File still exists at real path
    expect(existsSync(realFile)).toBe(true);
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

// ── Git worktree helpers ──────────────────────────────────────────────────────

describe('isGitRepo', () => {
  let execFileSync: Mock;

  beforeEach(async () => {
    const childProcess = await import('node:child_process');
    execFileSync = childProcess.execFileSync as unknown as Mock;
    vi.resetAllMocks();
  });

  it('returns true when git rev-parse succeeds', () => {
    execFileSync.mockReturnValue(undefined);
    expect(isGitRepo('/some/dir')).toBe(true);
    expect(execFileSync).toHaveBeenCalledWith('git', ['rev-parse', '--git-dir'], { cwd: '/some/dir', stdio: 'ignore' });
  });

  it('returns false when git rev-parse throws', () => {
    execFileSync.mockImplementation(() => {
      throw new Error('not a git repo');
    });
    expect(isGitRepo('/some/dir')).toBe(false);
  });
});

describe('createGitWorktree', () => {
  let execFileSync: Mock;

  beforeEach(async () => {
    const childProcess = await import('node:child_process');
    execFileSync = childProcess.execFileSync as unknown as Mock;
    vi.resetAllMocks();
  });

  it('calls git worktree add with full checkout (no --no-checkout, no sparse-checkout)', () => {
    execFileSync.mockReturnValue(undefined);
    createGitWorktree('/tmp/wt', 'workflow/test', '/repo');
    expect(execFileSync).toHaveBeenCalledWith('git', ['worktree', 'add', '/tmp/wt', '-b', 'workflow/test'], {
      cwd: '/repo',
    });
    const calls = execFileSync.mock.calls as string[][];
    expect(calls.some((c) => c[1]?.includes('--no-checkout'))).toBe(false);
    expect(calls.some((c) => c[1]?.includes('sparse-checkout'))).toBe(false);
  });
});

describe('workflowDone with git worktree', () => {
  let execFileSync: Mock;
  let dist: string;
  let rootDir: string;
  let writeRoot: string;

  beforeEach(async () => {
    const childProcess = await import('node:child_process');
    execFileSync = childProcess.execFileSync as unknown as Mock;
    vi.resetAllMocks();
    execFileSync.mockReturnValue(undefined);
    dist = mkdtempSync(resolve(tmpdir(), 'wf-git-done-'));
    rootDir = resolve(dist, 'project-root');
    writeRoot = resolve(dist, 'worktree');
    mkdirSync(rootDir, { recursive: true });
    mkdirSync(writeRoot, { recursive: true });
  });

  it('commits to worktree branch + removes worktree (no merge) when worktree_branch is set', async () => {
    const outputFile = resolve(writeRoot, 'components', 'btn.twig');
    mkdirSync(resolve(writeRoot, 'components'), { recursive: true });
    writeFileSync(outputFile, 'twig content');

    const name = workflowCreate(dist, 'debo-test', 'Test', [
      {
        id: 'task1',
        title: 'T1',
        type: 'component',
        step: 'do-task',
        stage: 'execute',
        files: [{ path: outputFile, key: 'template', validators: [] }],
      },
    ]);
    workflowPlan(
      dist,
      name,
      [
        {
          id: 'task1',
          title: 'T1',
          type: 'component',
          step: 'do-task',
          stage: 'execute',
          files: [{ path: outputFile, key: 'template', validators: [] }],
        },
      ],
      { execute: { steps: ['do-task'] } },
      undefined,
      writeRoot,
      rootDir,
      'workflow/test',
    );

    const data = readWorkflowFile(dist, name);
    data.tasks[0]!.files![0]!.validation_result = {
      file: outputFile,
      type: 'component',
      valid: true,
      last_validated: '',
    };
    writeFileSync(tasksYmlPath(dist, name), stringifyYaml(data));

    const result = await await workflowDone(dist, name, 'task1');
    // Worktree path: not archived — stays in changes/ until workflow merge
    expect(result.archived).toBe(false);
    const calls = execFileSync.mock.calls as string[][];
    // Should have committed in the worktree
    expect(calls.some((c) => c[1]?.includes('commit'))).toBe(true);
    // Should have removed the worktree directory
    expect(calls.some((c) => c[1]?.includes('remove'))).toBe(true);
    // Should NOT have done a git merge
    expect(calls.some((c) => c[1]?.includes('merge'))).toBe(false);
  });
});

// ── checkPreflightClean ───────────────────────────────────────────────────────

describe('checkPreflightClean', () => {
  let execFileSync: Mock;

  beforeEach(async () => {
    const childProcess = await import('node:child_process');
    execFileSync = childProcess.execFileSync as unknown as Mock;
    vi.resetAllMocks();
  });

  it('returns clean=true when git status outputs nothing', () => {
    execFileSync.mockReturnValue('');
    const result = checkPreflightClean('/repo', '/repo/packages/theme');
    expect(result.clean).toBe(true);
    expect(result.files).toEqual([]);
  });

  it('returns clean=false with file list when uncommitted changes exist', () => {
    execFileSync.mockReturnValue(' M packages/theme/components/btn.twig\n?? packages/theme/tokens.yml\n');
    const result = checkPreflightClean('/repo', '/repo/packages/theme');
    expect(result.clean).toBe(false);
    expect(result.files).toContain('packages/theme/components/btn.twig');
    expect(result.files).toContain('packages/theme/tokens.yml');
  });

  it('returns clean=true when git command throws (non-git directory)', () => {
    execFileSync.mockImplementation(() => {
      throw new Error('not a git repo');
    });
    const result = checkPreflightClean('/repo', '/repo/packages/theme');
    expect(result.clean).toBe(true);
  });

  it('passes the relative outputsRoot path to git status', () => {
    execFileSync.mockReturnValue('');
    checkPreflightClean('/repo', '/repo/packages/theme');
    expect(execFileSync).toHaveBeenCalledWith('git', ['-C', '/repo', 'status', '--porcelain', '--', 'packages/theme'], {
      encoding: 'utf-8',
    });
  });
});

// ── workflowMerge ─────────────────────────────────────────────────────────────

describe('workflowMerge', () => {
  let execFileSync: Mock;
  let dist: string;
  let rootDir: string;

  beforeEach(async () => {
    const childProcess = await import('node:child_process');
    execFileSync = childProcess.execFileSync as unknown as Mock;
    vi.resetAllMocks();
    execFileSync.mockReturnValue(undefined);
    dist = mkdtempSync(resolve(tmpdir(), 'wf-wmerge-'));
    rootDir = resolve(dist, 'project-root');
    mkdirSync(rootDir, { recursive: true });
  });

  function makeWorkflow(worktreeBranch?: string) {
    const name = workflowCreate(dist, 'debo-test', 'Test', [{ id: 'task1', title: 'T1', type: 'data' }]);
    workflowPlan(
      dist,
      name,
      [{ id: 'task1', title: 'T1', type: 'data' }],
      undefined,
      undefined,
      undefined,
      rootDir,
      worktreeBranch,
    );
    return name;
  }

  it('calls git merge --squash + commit + branch delete', () => {
    const name = makeWorkflow('workflow/test');
    workflowMerge(dist, name);
    const calls = execFileSync.mock.calls as string[][];
    expect(
      calls.some((c) => c[1]?.includes('merge') && c[1]?.includes('--squash') && c[1]?.includes('workflow/test')),
    ).toBe(true);
    expect(calls.some((c) => c[1]?.includes('commit') && c[1]?.includes('workflow: debo-test'))).toBe(true);
    expect(calls.some((c) => c[1]?.includes('-D') && c[1]?.includes('workflow/test'))).toBe(true);
  });

  it('archives workflow after merge', () => {
    const name = makeWorkflow('workflow/test');
    workflowMerge(dist, name);
    // Workflow moved to archive
    expect(existsSync(resolve(dist, 'workflows', 'archive', name, 'tasks.yml'))).toBe(true);
    expect(existsSync(tasksYmlPath(dist, name))).toBe(false);
  });

  it('throws when worktree_branch is not set', () => {
    const name = makeWorkflow(); // no branch → resolves to direct engine
    expect(() => workflowMerge(dist, name)).toThrow('does not support merge');
  });

  it('returns branch and workspace_root', () => {
    const name = makeWorkflow('workflow/test');
    const result = workflowMerge(dist, name);
    expect(result.branch).toBe('workflow/test');
    expect(result.workspace_root).toBe(rootDir);
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
    workflowPlan(
      dist,
      name,
      [{ id: 'task1', title: 'T1', type: 'data', step: 'do-task', stage: 'execute' }],
      { execute: { steps: ['do-task'] } },
      undefined,
      undefined,
      undefined,
      undefined,
      'direct',
    );

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
    workflowPlan(
      dist,
      name,
      [{ id: 'task1', title: 'T1', type: 'data', step: 'do-task', stage: 'execute' }],
      { execute: { steps: ['do-task'] } },
      undefined,
      undefined,
      undefined,
      undefined,
      'direct',
    );

    mock.mockClear();
    await workflowDone(dist, name, 'task1');
    expect(mock).not.toHaveBeenCalled();
  });
});

describe('workflowPlan engine storage', () => {
  let dist: string;

  beforeEach(() => {
    dist = mkdtempSync(resolve(tmpdir(), 'wf-engine-'));
  });

  it('stores engine field in tasks.yml', () => {
    const name = workflowCreate(dist, 'debo-test', 'Test', []);
    workflowPlan(dist, name, [], undefined, undefined, undefined, undefined, undefined, 'direct');
    const data = readWorkflowFile(dist, name);
    expect(data.engine).toBe('direct');
  });

  it('stores git-worktree engine field in tasks.yml', () => {
    const name = workflowCreate(dist, 'debo-test', 'Test', []);
    workflowPlan(dist, name, [], undefined, undefined, undefined, undefined, undefined, 'git-worktree');
    const data = readWorkflowFile(dist, name);
    expect(data.engine).toBe('git-worktree');
  });

  it('does not store engine field when not provided', () => {
    const name = workflowCreate(dist, 'debo-test', 'Test', []);
    workflowPlan(dist, name, []);
    const data = readWorkflowFile(dist, name);
    expect(data.engine).toBeUndefined();
  });
});

describe('workflowMerge with engine: direct', () => {
  let dist: string;

  beforeEach(() => {
    dist = mkdtempSync(resolve(tmpdir(), 'wf-merge-direct-'));
  });

  it('throws when engine is direct (nothing to merge)', () => {
    const name = workflowCreate(dist, 'debo-test', 'Test', [{ id: 'task1', title: 'T1', type: 'data' }]);
    workflowPlan(
      dist,
      name,
      [{ id: 'task1', title: 'T1', type: 'data' }],
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      'direct',
    );

    expect(() => workflowMerge(dist, name)).toThrow();
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
      undefined,
      undefined,
      undefined,
      undefined,
      'direct',
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
      undefined,
      undefined,
      undefined,
      undefined,
      'direct',
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
      undefined,
      undefined,
      undefined,
      undefined,
      'direct',
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
      undefined,
      undefined,
      undefined,
      undefined,
      'direct',
    );

    const result = await await workflowDone(dist, name, 'task1');
    expect(result.archived).toBe(true);
    expect(result.response).toBeDefined();
    expect(result.response!.stage).toBe('done');
  });
});

// ── expandTasksFromParams: when.type filtering ─────────────────────────────

describe('expandTasksFromParams when-condition filtering', () => {
  let taskDir: string;

  beforeEach(() => {
    taskDir = mkdtempSync(resolve(tmpdir(), 'wf-when-type-'));

    // Task file with when.type: screenshot
    writeFileSync(
      resolve(taskDir, 'capture.md'),
      [
        '---',
        'when:',
        '  steps: [capture]',
        '  type: screenshot',
        'params:',
        '  scene: ~',
        '  breakpoint: ~',
        '  region: ~',
        '  type: ~',
        'files: []',
        '---',
        '# Capture',
      ].join('\n'),
    );

    // Task file with when.type: markup
    writeFileSync(
      resolve(taskDir, 'compare-markup.md'),
      [
        '---',
        'when:',
        '  steps: [compare]',
        '  type: markup',
        'params:',
        '  scene: ~',
        '  breakpoint: ~',
        '  type: ~',
        'files: []',
        '---',
        '# Compare Markup',
      ].join('\n'),
    );

    // Task file with when.type: screenshot
    writeFileSync(
      resolve(taskDir, 'compare-screenshots.md'),
      [
        '---',
        'when:',
        '  steps: [compare]',
        '  type: screenshot',
        'params:',
        '  scene: ~',
        '  breakpoint: ~',
        '  region: ~',
        '  type: ~',
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

  it('filters tasks by when.type — screenshot items only get screenshot tasks', () => {
    const stages = { test: { each: 'checks', steps: ['capture', 'compare'] } };
    const params = {
      scene: 'design-system:shell',
      checks: [
        { scene: 'design-system:shell', breakpoint: 'xl', region: 'header', type: 'screenshot' },
        { scene: 'design-system:shell', breakpoint: 'xl', region: 'markup', type: 'markup' },
      ],
    };

    const tasks = expandTasksFromParams(makeStageLoaded(), stages, params, [], {});

    // Screenshot check should get: capture + compare-screenshots (2 tasks)
    // Markup check should get: compare-markup only (1 task, no capture)
    const screenshotTasks = tasks.filter((t) => t.params?.type === 'screenshot');
    const markupTasks = tasks.filter((t) => t.params?.type === 'markup');

    expect(screenshotTasks).toHaveLength(2);
    expect(screenshotTasks.map((t) => t.step)).toEqual(['capture', 'compare']);

    expect(markupTasks).toHaveLength(1);
    expect(markupTasks[0]!.step).toBe('compare');
    expect(markupTasks[0]!.task_file).toContain('compare-markup.md');
  });

  it('screenshot compare resolves to compare-screenshots task file', () => {
    const stages = { test: { each: 'checks', steps: ['compare'] } };
    const params = {
      scene: 'design-system:shell',
      checks: [{ scene: 'design-system:shell', breakpoint: 'xl', region: 'header', type: 'screenshot' }],
    };

    const tasks = expandTasksFromParams(makeStageLoaded(), stages, params, [], {});
    expect(tasks).toHaveLength(1);
    expect(tasks[0]!.task_file).toContain('compare-screenshots.md');
  });

  it('markup compare resolves to compare-markup task file', () => {
    const stages = { test: { each: 'checks', steps: ['compare'] } };
    const params = {
      scene: 'design-system:shell',
      checks: [{ scene: 'design-system:shell', breakpoint: 'xl', region: 'markup', type: 'markup' }],
    };

    const tasks = expandTasksFromParams(makeStageLoaded(), stages, params, [], {});
    expect(tasks).toHaveLength(1);
    expect(tasks[0]!.task_file).toContain('compare-markup.md');
  });

  it('when.type filters before param validation — mismatched type skips task entirely', () => {
    const stages = { test: { each: 'checks', steps: ['capture'] } };
    const params = {
      scene: 'design-system:shell',
      checks: [{ scene: 'design-system:shell', breakpoint: 'xl', region: 'markup', type: 'markup' }],
    };

    // capture has when.type: screenshot — markup item should produce zero capture tasks
    const tasks = expandTasksFromParams(makeStageLoaded(), stages, params, [], {});
    expect(tasks).toHaveLength(0);
  });
});
