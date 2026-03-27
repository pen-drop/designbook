/**
 * Integration tests for git worktree workflow lifecycle.
 * Uses real git repositories (git init in temp dirs) — no mocks.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
} from 'node:fs';
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
      } catch { /* ignore cleanup errors */ }
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
      } catch { /* ignore */ }
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
      } catch { /* ignore */ }
    }
  });
});

// ── full round-trip: plan → write → done → merge ─────────────────────────────

describe('workflow round-trip (real git)', () => {
  it('commits output files to branch and squash-merges on workflowMerge', () => {
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
          files: [outputFilePath],
        },
      ],
      undefined,
      undefined,
      worktreePath,
      rootDir,
      branchName,
    );

    // 4. Write output file into the worktree
    mkdirSync(resolve(worktreePath, 'src'), { recursive: true });
    writeFileSync(outputFilePath, 'name: Button\ntype: component');

    // 5. Validate the file (mark it non-requiring-validation)
    const data = readTasksYml(dist, name);
    const task = data.tasks.find((t) => t.id === 'task-1')!;
    task.files![0].requires_validation = false;
    task.files![0].validation_result = { file: outputFilePath, type: 'component', valid: true, skipped: false, last_validated: new Date().toISOString() };
    const tasksYmlPath = resolve(dist, 'workflows', 'changes', name, 'tasks.yml');
    writeFileSync(tasksYmlPath, stringifyYaml(data));

    // 6. Mark task done — should commit to branch + remove worktree
    const { archived } = workflowDone(dist, name, 'task-1');

    // Worktree was committed and removed
    expect(archived).toBe(false); // not archived — needs merge
    expect(existsSync(worktreePath)).toBe(false); // worktree dir removed

    // Branch still exists in git
    const branches = execFileSync('git', ['branch'], { cwd: rootDir, encoding: 'utf-8' });
    expect(branches).toContain(branchName);

    // 7. workflowMerge squash-merges branch and archives
    const mergeResult = workflowMerge(dist, name);
    expect(mergeResult.branch).toBe(branchName);
    expect(mergeResult.root_dir).toBe(rootDir);

    // Branch deleted
    const branchesAfterMerge = execFileSync('git', ['branch'], { cwd: rootDir, encoding: 'utf-8' });
    expect(branchesAfterMerge).not.toContain(branchName);

    // Output file now exists in working tree
    expect(existsSync(resolve(rootDir, 'src', 'button.yml'))).toBe(true);

    // Workflow archived
    expect(existsSync(resolve(dist, 'workflows', 'archive', name))).toBe(true);
    expect(existsSync(resolve(dist, 'workflows', 'changes', name))).toBe(false);
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
        { id: 'output-1', title: 'Create Card', type: 'component', files: [outputFilePath] },
        { id: 'test-1', title: 'Visual Test', type: 'test', files: [] },
      ],
      undefined,
      undefined,
      worktreePath,
      rootDir,
      branchName,
    );

    // Validate output task's file
    const data = readTasksYml(dist, name);
    const outputTask = data.tasks.find((t) => t.id === 'output-1')!;
    outputTask.files![0].requires_validation = false;
    outputTask.files![0].validation_result = { file: outputFilePath, type: 'component', valid: true, skipped: false, last_validated: new Date().toISOString() };
    const ymlPath = resolve(dist, 'workflows', 'changes', name, 'tasks.yml');
    writeFileSync(ymlPath, stringifyYaml(data));

    // Mark output task done — triggers commit to branch
    const result1 = workflowDone(dist, name, 'output-1');
    expect(result1.archived).toBe(false);

    // Worktree removed after commit
    expect(existsSync(worktreePath)).toBe(false);

    // Validate test task's empty files (no files = nothing to validate)
    const data2 = readTasksYml(dist, name);
    const testTask = data2.tasks.find((t) => t.id === 'test-1')!;
    // test task has no files, mark directly
    testTask.status = 'done';
    const ymlPath2 = resolve(dist, 'workflows', 'changes', name, 'tasks.yml');
    writeFileSync(ymlPath2, stringifyYaml(data2));

    // Since we manipulated the file, call workflowDone for test task — but test task has no files so validation passes
    // Re-write with clean state so workflowDone can mark it done
    const data3 = readTasksYml(dist, name);
    const testTask2 = data3.tasks.find((t) => t.id === 'test-1')!;
    testTask2.status = 'pending'; // reset so workflowDone can mark done
    writeFileSync(ymlPath2, stringifyYaml(data3));

    const result2 = workflowDone(dist, name, 'test-1');
    // All done but worktree_branch set → stays in changes/, not archived
    expect(result2.archived).toBe(false);
    expect(existsSync(resolve(dist, 'workflows', 'changes', name))).toBe(true);
  });
});
