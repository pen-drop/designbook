/**
 * Integration tests for git worktree workflow lifecycle.
 * Uses real git repositories (git init in temp dirs) — no mocks.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { load as parseYaml, dump as stringifyYaml } from 'js-yaml';
import {
  checkPreflightClean,
  createGitWorktree,
  isGitRepo,
  workflowCreate,
  workflowPlan,
  workflowDone,
  workflowMerge,
  type WorkflowFile,
} from '../../workflow.js';
import { resolveEngine } from '../../engines/index.js';

// ── helpers ─────────────────────────────────────────────────────────────────

function initGitRepo(dir: string): void {
  execFileSync('git', ['init'], { cwd: dir });
  execFileSync('git', ['config', 'user.email', 'test@test.com'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: dir });
}

function initialCommit(dir: string): void {
  writeFileSync(resolve(dir, '.gitkeep'), '');
  execFileSync('git', ['add', '.'], { cwd: dir });
  execFileSync('git', ['commit', '-m', 'init'], { cwd: dir });
}

function readTasksYml(dist: string, name: string): WorkflowFile {
  return parseYaml(readFileSync(resolve(dist, 'workflows', 'changes', name, 'tasks.yml'), 'utf-8')) as WorkflowFile;
}

// ── test fixture ─────────────────────────────────────────────────────────────

let rootDir: string;
let dist: string;

beforeEach(() => {
  rootDir = mkdtempSync(resolve(tmpdir(), 'wf-int-root-'));
  dist = resolve(rootDir, '.dist');
  mkdirSync(dist, { recursive: true });
  initGitRepo(rootDir);
  initialCommit(rootDir);
});

afterEach(() => {
  rmSync(rootDir, { recursive: true, force: true });
});

// ── isGitRepo ─────────────────────────────────────────────────────────────────

describe('isGitRepo (real git)', () => {
  it('returns true for a real git repository', () => {
    expect(isGitRepo(rootDir)).toBe(true);
  });

  it('returns false for a plain directory', () => {
    const plain = mkdtempSync(resolve(tmpdir(), 'wf-plain-'));
    try {
      expect(isGitRepo(plain)).toBe(false);
    } finally {
      rmSync(plain, { recursive: true, force: true });
    }
  });
});

// ── checkPreflightClean ───────────────────────────────────────────────────────

describe('checkPreflightClean (real git)', () => {
  it('returns clean=true when no uncommitted changes in outputsRoot', () => {
    const outputsRoot = resolve(rootDir, 'src');
    mkdirSync(outputsRoot, { recursive: true });
    const result = checkPreflightClean(rootDir, outputsRoot);
    expect(result.clean).toBe(true);
    expect(result.files).toEqual([]);
  });

  it('returns clean=false with file list when outputsRoot has uncommitted changes', () => {
    const outputsRoot = resolve(rootDir, 'src');
    mkdirSync(outputsRoot, { recursive: true });
    // Track the file first so git sees a modification (not untracked dir)
    writeFileSync(resolve(outputsRoot, 'component.yml'), 'name: Button');
    execFileSync('git', ['add', '.'], { cwd: rootDir });
    execFileSync('git', ['commit', '-m', 'add component'], { cwd: rootDir });
    // Now modify the tracked file
    writeFileSync(resolve(outputsRoot, 'component.yml'), 'name: Button\nmodified: true');

    const result = checkPreflightClean(rootDir, outputsRoot);
    expect(result.clean).toBe(false);
    expect(result.files.length).toBeGreaterThan(0);
    expect(result.files.some((f) => f.includes('component.yml'))).toBe(true);
  });

  it('returns clean=true when file is staged+committed', () => {
    const outputsRoot = resolve(rootDir, 'src');
    mkdirSync(outputsRoot, { recursive: true });
    writeFileSync(resolve(outputsRoot, 'component.yml'), 'name: Button');
    execFileSync('git', ['add', '.'], { cwd: rootDir });
    execFileSync('git', ['commit', '-m', 'add component'], { cwd: rootDir });

    const result = checkPreflightClean(rootDir, outputsRoot);
    expect(result.clean).toBe(true);
  });

  it('returns clean=true when dirty file is outside outputsRoot', () => {
    const outputsRoot = resolve(rootDir, 'src');
    mkdirSync(outputsRoot, { recursive: true });
    // Dirty file in a different directory, not under src/
    writeFileSync(resolve(rootDir, 'other.yml'), 'foo: bar');

    const result = checkPreflightClean(rootDir, outputsRoot);
    expect(result.clean).toBe(true);
  });
});

// ── createGitWorktree ─────────────────────────────────────────────────────────

describe('createGitWorktree (real git)', () => {
  it('creates a worktree directory at the specified path', () => {
    const worktreePath = resolve(rootDir, '..', 'wt-test');
    const branchName = 'workflow/test-branch';
    try {
      createGitWorktree(worktreePath, branchName, rootDir);
      expect(existsSync(worktreePath)).toBe(true);
    } finally {
      try {
        execFileSync('git', ['worktree', 'remove', worktreePath, '--force'], { cwd: rootDir });
        execFileSync('git', ['branch', '-d', branchName], { cwd: rootDir });
      } catch {
        /* ignore cleanup errors */
      }
    }
  });

  it('creates a new branch in the git repo', () => {
    const worktreePath = resolve(rootDir, '..', 'wt-branch');
    const branchName = 'workflow/branch-check';
    try {
      createGitWorktree(worktreePath, branchName, rootDir);
      const branches = execFileSync('git', ['branch'], { cwd: rootDir, encoding: 'utf-8' });
      expect(branches).toContain(branchName);
    } finally {
      try {
        execFileSync('git', ['worktree', 'remove', worktreePath, '--force'], { cwd: rootDir });
        execFileSync('git', ['branch', '-d', branchName], { cwd: rootDir });
      } catch {
        /* ignore */
      }
    }
  });

  it('worktree has the same initial files as root', () => {
    const worktreePath = resolve(rootDir, '..', 'wt-files');
    const branchName = 'workflow/files-check';
    try {
      createGitWorktree(worktreePath, branchName, rootDir);
      expect(existsSync(resolve(worktreePath, '.gitkeep'))).toBe(true);
    } finally {
      try {
        execFileSync('git', ['worktree', 'remove', worktreePath, '--force'], { cwd: rootDir });
        execFileSync('git', ['branch', '-d', branchName], { cwd: rootDir });
      } catch {
        /* ignore */
      }
    }
  });
});

// ── full round-trip: plan → write → done → merge ─────────────────────────────

describe('workflow round-trip (real git)', () => {
  it('commits output files to branch and squash-merges on workflowMerge', async () => {
    // 1. Create worktree path (initial commit already exists from beforeEach)
    const worktreePath = resolve(rootDir, '..', `wt-roundtrip-${Date.now()}`);
    const branchName = 'workflow/roundtrip';

    createGitWorktree(worktreePath, branchName, rootDir);

    // 2. Create dist dir and workflow
    const name = workflowCreate(dist, 'debo-test', 'Round-trip Test', []);

    // 3. Plan workflow with worktree info
    const outputFilePath = resolve(worktreePath, 'src', 'button.yml');
    workflowPlan(
      dist,
      name,
      [
        {
          id: 'task-1',
          title: 'Create Button',
          type: 'component',
          step: 'create-component',
          stage: 'execute',
          files: [{ path: outputFilePath, key: 'component', validators: [] }],
        },
      ],
      { execute: { steps: ['create-component'] } },
      undefined,
      worktreePath,
      rootDir,
      branchName,
    );

    // 4. Write output file into the worktree
    mkdirSync(resolve(worktreePath, 'src'), { recursive: true });
    writeFileSync(outputFilePath, 'name: Button\ntype: component');

    // 5. Mark file as written+validated
    const data = readTasksYml(dist, name);
    const task = data.tasks.find((t) => t.id === 'task-1')!;
    task.files![0]!.validation_result = {
      file: outputFilePath,
      type: 'component',
      valid: true,
      skipped: false,
      last_validated: new Date().toISOString(),
    };
    const tasksYmlPath = resolve(dist, 'workflows', 'changes', name, 'tasks.yml');
    writeFileSync(tasksYmlPath, stringifyYaml(data));

    // 6. Mark task done — should commit to branch + remove worktree
    const { archived } = await workflowDone(dist, name, 'task-1');

    // Worktree was committed and removed
    expect(archived).toBe(false); // not archived — needs merge
    expect(existsSync(worktreePath)).toBe(false); // worktree dir removed

    // Branch still exists in git
    const branches = execFileSync('git', ['branch'], { cwd: rootDir, encoding: 'utf-8' });
    expect(branches).toContain(branchName);

    // 7. workflowMerge squash-merges branch and archives
    const mergeResult = workflowMerge(dist, name);
    expect(mergeResult.branch).toBe(branchName);
    expect(mergeResult.workspace_root).toBe(rootDir);

    // Branch deleted
    const branchesAfterMerge = execFileSync('git', ['branch'], { cwd: rootDir, encoding: 'utf-8' });
    expect(branchesAfterMerge).not.toContain(branchName);

    // Output file now exists in working tree
    expect(existsSync(resolve(rootDir, 'src', 'button.yml'))).toBe(true);

    // Workflow archived
    expect(existsSync(resolve(dist, 'workflows', 'archive', name))).toBe(true);
    expect(existsSync(resolve(dist, 'workflows', 'changes', name))).toBe(false);
  });

  it('commits output files to branch and squash-merges on workflowMerge (explicit engine: git-worktree)', async () => {
    // Same as existing round-trip but with explicit engine field
    const worktreePath = resolve(rootDir, '..', `wt-explicit-${Date.now()}`);
    const branchName = 'workflow/explicit-engine';

    createGitWorktree(worktreePath, branchName, rootDir);

    const name = workflowCreate(dist, 'debo-test', 'Explicit Engine Test', []);
    const outputFilePath = resolve(worktreePath, 'src', 'card.yml');
    workflowPlan(
      dist,
      name,
      [
        {
          id: 'task-1',
          title: 'Create Card',
          type: 'component',
          step: 'create-component',
          stage: 'execute',
          files: [{ path: outputFilePath, key: 'component', validators: [] }],
        },
      ],
      { execute: { steps: ['create-component'] } },
      undefined,
      worktreePath,
      rootDir,
      branchName,
      'git-worktree',
    );

    // Verify engine field is stored
    const planned = readTasksYml(dist, name);
    expect(planned.engine).toBe('git-worktree');

    mkdirSync(resolve(worktreePath, 'src'), { recursive: true });
    writeFileSync(outputFilePath, 'name: Card');

    const data = readTasksYml(dist, name);
    data.tasks[0]!.files![0]!.validation_result = {
      file: outputFilePath,
      type: 'component',
      valid: true,
      skipped: false,
      last_validated: new Date().toISOString(),
    };
    writeFileSync(resolve(dist, 'workflows', 'changes', name, 'tasks.yml'), stringifyYaml(data));

    const { archived } = await workflowDone(dist, name, 'task-1');
    expect(archived).toBe(false); // needs merge

    const mergeResult = workflowMerge(dist, name);
    expect(mergeResult.branch).toBe(branchName);
    expect(existsSync(resolve(rootDir, 'src', 'card.yml'))).toBe(true);
    expect(existsSync(resolve(dist, 'workflows', 'archive', name))).toBe(true);
  });

  it('workflowDone stays in changes/ (not archived) when worktree_branch set and test tasks remain', async () => {
    const worktreePath = resolve(rootDir, '..', `wt-testpending-${Date.now()}`);
    const branchName = 'workflow/test-pending';
    createGitWorktree(worktreePath, branchName, rootDir);

    const outputFilePath = resolve(worktreePath, 'src', 'card.yml');
    mkdirSync(resolve(worktreePath, 'src'), { recursive: true });
    writeFileSync(outputFilePath, 'name: Card');

    const name = workflowCreate(dist, 'debo-test', 'Test Pending', []);
    workflowPlan(
      dist,
      name,
      [
        {
          id: 'output-1',
          title: 'Create Card',
          type: 'component',
          step: 'create-component',
          stage: 'execute',
          files: [{ path: outputFilePath, key: 'component', validators: [] }],
        },
        { id: 'test-1', title: 'Visual Test', type: 'test', step: 'visual-diff', stage: 'test', files: [] },
      ],
      { execute: { steps: ['create-component'] }, test: { steps: ['visual-diff'] } },
      undefined,
      worktreePath,
      rootDir,
      branchName,
    );

    // Mark output task's file as written+validated
    const data = readTasksYml(dist, name);
    const outputTask = data.tasks.find((t) => t.id === 'output-1')!;
    outputTask.files![0]!.validation_result = {
      file: outputFilePath,
      type: 'component',
      valid: true,
      skipped: false,
      last_validated: new Date().toISOString(),
    };
    const ymlPath = resolve(dist, 'workflows', 'changes', name, 'tasks.yml');
    writeFileSync(ymlPath, stringifyYaml(data));

    // Mark output task done — stage transitions execute→test (worktree not yet committed)
    const result1 = await workflowDone(dist, name, 'output-1');
    expect(result1.archived).toBe(false);

    // Worktree still exists — committed stage comes after test stage with { execute, test } lifecycle
    expect(existsSync(worktreePath)).toBe(true);

    // test-1 was auto-advanced to in-progress — call workflowDone on it directly
    // No files → no validation needed; stage transitions test→committed (commit runs, worktree removed)
    const result2 = await workflowDone(dist, name, 'test-1');
    // All done but worktree_branch set → stays in changes/, not archived (waiting for merge_approved)
    expect(result2.archived).toBe(false);
    expect(existsSync(resolve(dist, 'workflows', 'changes', name))).toBe(true);
  });
});

// ── direct engine round-trip ────────────────────────────────────────────────

describe('direct engine round-trip (real git)', () => {
  it('plan → write → done → auto-archives (no merge needed)', async () => {
    const name = workflowCreate(dist, 'debo-test', 'Direct Test', []);
    const outputFilePath = resolve(rootDir, 'src', 'button.yml');
    workflowPlan(
      dist,
      name,
      [
        {
          id: 'task-1',
          title: 'Create Button',
          type: 'component',
          step: 'create-component',
          stage: 'execute',
          files: [{ path: outputFilePath, key: 'component', validators: [] }],
        },
      ],
      { execute: { steps: ['create-component'] } },
      undefined,
      undefined,
      undefined,
      undefined,
      'direct',
    );

    // Verify no write_root in tasks.yml
    const planned = readTasksYml(dist, name);
    expect(planned.engine).toBe('direct');
    expect(planned.write_root).toBeUndefined();
    expect(planned.worktree_branch).toBeUndefined();

    // Write file to real path (no worktree)
    mkdirSync(resolve(rootDir, 'src'), { recursive: true });
    writeFileSync(outputFilePath, 'name: Button\ntype: component');

    // Mark file as written+validated
    const data = readTasksYml(dist, name);
    data.tasks[0]!.files![0]!.validation_result = {
      file: outputFilePath,
      type: 'component',
      valid: true,
      skipped: false,
      last_validated: new Date().toISOString(),
    };
    writeFileSync(resolve(dist, 'workflows', 'changes', name, 'tasks.yml'), stringifyYaml(data));

    // Done → auto-archives
    const { archived } = await workflowDone(dist, name, 'task-1');
    expect(archived).toBe(true);
    expect(existsSync(resolve(dist, 'workflows', 'archive', name))).toBe(true);
    expect(existsSync(resolve(dist, 'workflows', 'changes', name))).toBe(false);

    // File stays at real path
    expect(readFileSync(outputFilePath, 'utf-8')).toBe('name: Button\ntype: component');
  });

  it('files[] point to real paths, no write_root in tasks.yml', () => {
    const name = workflowCreate(dist, 'debo-test', 'Direct Paths', []);
    const filePath = resolve(rootDir, 'tokens', 'colors.yml');
    workflowPlan(
      dist,
      name,
      [
        {
          id: 'task-1',
          title: 'Create Tokens',
          type: 'tokens',
          files: [{ path: filePath, key: 'tokens', validators: [] }],
        },
      ],
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      'direct',
    );

    const data = readTasksYml(dist, name);
    expect(data.write_root).toBeUndefined();
    expect(data.tasks[0]!.files![0]!.path).toBe(filePath);
  });

  it('workflowMerge throws for direct engine', () => {
    const name = workflowCreate(dist, 'debo-test', 'Direct Merge', []);
    workflowPlan(
      dist,
      name,
      [{ id: 'task-1', title: 'T1', type: 'data' }],
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

// ── engine resolution ────────────────────────────────────────────────────────

describe('resolveEngine', () => {
  it('auto in git repo → git-worktree', () => {
    expect(resolveEngine(undefined, undefined, true)).toBe('git-worktree');
  });

  it('auto without git → direct', () => {
    expect(resolveEngine(undefined, undefined, false)).toBe('direct');
  });

  it('--engine direct overrides auto in git repo', () => {
    expect(resolveEngine('direct', undefined, true)).toBe('direct');
  });

  it('--engine flag overrides frontmatter', () => {
    expect(resolveEngine('direct', 'git-worktree', true)).toBe('direct');
  });

  it('frontmatter overrides auto', () => {
    expect(resolveEngine(undefined, 'direct', true)).toBe('direct');
  });

  it('throws on unknown engine name', () => {
    expect(() => resolveEngine('bogus')).toThrow('Unknown engine');
  });
});

// ── merge_available behavior ─────────────────────────────────────────────────

describe('merge_available behavior (real git)', () => {
  it('git-worktree + all done → not archived (merge available)', async () => {
    const worktreePath = resolve(rootDir, '..', `wt-merge-avail-${Date.now()}`);
    const branchName = 'workflow/merge-avail';
    createGitWorktree(worktreePath, branchName, rootDir);

    const name = workflowCreate(dist, 'debo-test', 'Merge Available', []);
    workflowPlan(
      dist,
      name,
      [{ id: 'task-1', title: 'T1', type: 'data', step: 'do-task', stage: 'execute' }],
      { execute: { steps: ['do-task'] } },
      undefined,
      worktreePath,
      rootDir,
      branchName,
      'git-worktree',
    );

    const result = await workflowDone(dist, name, 'task-1');
    // git-worktree + all done → stays in changes (merge available)
    expect(result.archived).toBe(false);
    expect(result.data.engine).toBe('git-worktree');
    expect(result.data.tasks.every((t) => t.status === 'done')).toBe(true);
  });

  it('direct + all done → archived (no merge)', async () => {
    const name = workflowCreate(dist, 'debo-test', 'Direct Done', []);
    workflowPlan(
      dist,
      name,
      [{ id: 'task-1', title: 'T1', type: 'data', step: 'do-task', stage: 'execute' }],
      { execute: { steps: ['do-task'] } },
      undefined,
      undefined,
      undefined,
      undefined,
      'direct',
    );

    const result = await workflowDone(dist, name, 'task-1');
    expect(result.archived).toBe(true);
  });

  it('git-worktree + tasks pending → not archived (not yet merge-able)', async () => {
    const worktreePath = resolve(rootDir, '..', `wt-pending-${Date.now()}`);
    const branchName = 'workflow/pending';
    createGitWorktree(worktreePath, branchName, rootDir);

    const name = workflowCreate(dist, 'debo-test', 'Pending Tasks', []);
    workflowPlan(
      dist,
      name,
      [
        { id: 'task-1', title: 'T1', type: 'data', step: 'do-task1', stage: 'execute' },
        { id: 'task-2', title: 'T2', type: 'data', step: 'do-task2', stage: 'execute' },
      ],
      { execute: { steps: ['do-task1', 'do-task2'] } },
      undefined,
      worktreePath,
      rootDir,
      branchName,
      'git-worktree',
    );

    const result = await workflowDone(dist, name, 'task-1');
    expect(result.archived).toBe(false);
    // Not all done yet — next task auto-advanced to in-progress
    expect(result.data.tasks.some((t) => t.status !== 'done')).toBe(true);
  });
});
