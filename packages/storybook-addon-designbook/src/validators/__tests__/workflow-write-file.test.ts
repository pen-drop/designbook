/**
 * Integration tests for the write-file pipeline.
 * Tests: plan → write-file → validate → flush → done for both engines.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { load as parseYaml } from 'js-yaml';
import {
  workflowCreate,
  workflowPlan,
  workflowWriteFile,
  workflowDone,
  workflowAbandon,
  type WorkflowFile,
} from '../../workflow.js';
import type { DesignbookConfig } from '../../config.js';
import { getValidatorKeys, getValidator, validateByKeys } from '../../validation-registry.js';
import { expandFileDeclarations, type TaskFileDeclaration } from '../../workflow-resolve.js';

// ── helpers ─────────────────────────────────────────────────────────────────

function readTasksYml(dist: string, name: string): WorkflowFile {
  return parseYaml(readFileSync(resolve(dist, 'workflows', 'changes', name, 'tasks.yml'), 'utf-8')) as WorkflowFile;
}

const mockConfig: DesignbookConfig = {
  data: '/tmp/test-designbook',
  technology: 'html',
  extensions: [],
};

// ── expandFileDeclarations ──────────────────────────────────────────────────

describe('expandFileDeclarations', () => {
  it('expands file path template and passes through key and validators', () => {
    const declarations: TaskFileDeclaration[] = [
      { file: '$DATA/design-tokens.yml', key: 'tokens', validators: ['tokens'] },
    ];
    const result = expandFileDeclarations(declarations, {}, { DATA: '/home/designbook' });
    expect(result).toEqual([{ path: '/home/designbook/design-tokens.yml', key: 'tokens', validators: ['tokens'] }]);
  });

  it('expands {{ param }} in file path', () => {
    const declarations: TaskFileDeclaration[] = [
      { file: '$DATA/sections/{{ id }}/data.yml', key: 'data', validators: ['data'] },
    ];
    const result = expandFileDeclarations(declarations, { id: 'dashboard' }, { DATA: '/d' });
    expect(result[0]!.path).toBe('/d/sections/dashboard/data.yml');
  });

  it('throws on duplicate key', () => {
    const declarations: TaskFileDeclaration[] = [
      { file: '/a.yml', key: 'same', validators: [] },
      { file: '/b.yml', key: 'same', validators: [] },
    ];
    expect(() => expandFileDeclarations(declarations, {}, {})).toThrow("Duplicate key 'same'");
  });

  it('defaults validators to empty array when omitted', () => {
    const declarations: TaskFileDeclaration[] = [{ file: '/a.yml', key: 'test' }];
    const result = expandFileDeclarations(declarations, {}, {});
    expect(result[0]!.validators).toEqual([]);
  });

  it('rejects unknown validator keys when validatorKeys provided', () => {
    const declarations: TaskFileDeclaration[] = [{ file: '/a.yml', key: 'test', validators: ['nonexistent'] }];
    const knownKeys = new Set(['tokens', 'component']);
    expect(() => expandFileDeclarations(declarations, {}, {}, knownKeys)).toThrow(
      "Unknown validator key 'nonexistent'",
    );
  });

  it('accepts known validator keys', () => {
    const declarations: TaskFileDeclaration[] = [{ file: '/a.yml', key: 'test', validators: ['tokens'] }];
    const knownKeys = new Set(['tokens', 'component']);
    expect(() => expandFileDeclarations(declarations, {}, {}, knownKeys)).not.toThrow();
  });
});

// ── validator key lookup ────────────────────────────────────────────────────

describe('validator key lookup', () => {
  it('getValidatorKeys returns all registered keys', () => {
    const keys = getValidatorKeys();
    expect(keys).toContain('component');
    expect(keys).toContain('tokens');
    expect(keys).toContain('data-model');
    expect(keys).toContain('data');
    expect(keys).toContain('entity-mapping');
    expect(keys).toContain('scene');
  });

  it('getValidator returns function for known key', () => {
    expect(getValidator('tokens')).toBeTypeOf('function');
  });

  it('getValidator returns undefined for unknown key', () => {
    expect(getValidator('bogus')).toBeUndefined();
  });

  it('validateByKeys with empty array returns auto-pass', async () => {
    const result = await validateByKeys([], '/any/file', mockConfig);
    expect(result.valid).toBe(true);
    expect(result.skipped).toBe(true);
  });

  it('validateByKeys with unknown key returns error', async () => {
    const result = await validateByKeys(['nope'], '/any/file', mockConfig);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Unknown validator key: 'nope'");
  });
});

// ── write-file full pipeline (direct engine) ────────────────────────────────

describe('write-file pipeline (direct engine)', () => {
  let dist: string;
  let config: DesignbookConfig;

  beforeEach(() => {
    dist = mkdtempSync(resolve(tmpdir(), 'wf-writefile-'));
    config = { data: dist, technology: 'html', extensions: [] };
  });

  it('plan → write-file → validation result returned → done succeeds', async () => {
    const targetPath = resolve(dist, 'design-system', 'design-tokens.yml');
    const name = workflowCreate(dist, 'debo-test', 'Test', []);
    workflowPlan(
      dist,
      name,
      [
        {
          id: 'create-tokens',
          title: 'Create Tokens',
          type: 'tokens',
          files: [{ path: targetPath, key: 'design-tokens', validators: [] }],
        },
      ],
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      'direct',
    );

    // write-file: content via API (simulating CLI stdin)
    const content = 'color:\n  primary:\n    $value: "#ff0000"\n    $type: color\n';
    const result = await workflowWriteFile(dist, name, 'create-tokens', 'design-tokens', content, config);

    // Should be valid (empty validators = auto-pass)
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.file_path).toBeTruthy();

    // Task state updated in tasks.yml
    const data = readTasksYml(dist, name);
    const task = data.tasks[0]!;
    expect(task.files![0]!.validation_result).toBeDefined();
    expect(task.files![0]!.validation_result!.valid).toBe(true);

    // File is stashed at target dir with .debo suffix, not at final target path
    expect(existsSync(targetPath)).toBe(false);
    expect(result.file_path).toMatch(/\.debo$/);
    expect(existsSync(result.file_path)).toBe(true);

    // workflow done succeeds (gate-check passes)
    const doneResult = await workflowDone(dist, name, 'create-tokens');
    expect(doneResult.archived).toBe(true);
  });

  it('write-file with invalid content returns valid: false but still stashes', async () => {
    const targetPath = resolve(dist, 'data-model.yml');
    const name = workflowCreate(dist, 'debo-test', 'Test', []);
    workflowPlan(
      dist,
      name,
      [
        {
          id: 'create-dm',
          title: 'Create Data Model',
          type: 'data',
          files: [{ path: targetPath, key: 'data-model', validators: ['data-model'] }],
        },
      ],
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      'direct',
    );

    // Write invalid content (data-model validator expects specific structure)
    const result = await workflowWriteFile(dist, name, 'create-dm', 'data-model', 'invalid: true', config);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    // File still written at target dir with .debo suffix
    expect(result.file_path).toMatch(/\.debo$/);
    expect(existsSync(result.file_path)).toBe(true);

    // workflow done should reject (file has errors)
    await expect(() => workflowDone(dist, name, 'create-dm')).rejects.toThrow('errors');
  });

  it('write-file re-write overwrites stash and re-validates', async () => {
    const targetPath = resolve(dist, 'data-model.yml');
    const name = workflowCreate(dist, 'debo-test', 'Test', []);
    workflowPlan(
      dist,
      name,
      [
        {
          id: 'task1',
          title: 'T1',
          type: 'data',
          files: [{ path: targetPath, key: 'dm', validators: [] }],
        },
      ],
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      'direct',
    );

    // First write
    await workflowWriteFile(dist, name, 'task1', 'dm', 'version: 1', config);
    const data1 = readTasksYml(dist, name);
    const ts1 = data1.tasks[0]!.files![0]!.validation_result!.last_validated;

    // Second write overwrites
    await workflowWriteFile(dist, name, 'task1', 'dm', 'version: 2', config);
    const data2 = readTasksYml(dist, name);
    const ts2 = data2.tasks[0]!.files![0]!.validation_result!.last_validated;

    // Timestamps should differ (re-validated)
    expect(ts2).not.toBe(ts1);
  });

  it('write-file rejects unknown key', async () => {
    const name = workflowCreate(dist, 'debo-test', 'Test', []);
    workflowPlan(
      dist,
      name,
      [
        {
          id: 'task1',
          title: 'T1',
          type: 'data',
          files: [{ path: '/x', key: 'known', validators: [] }],
        },
      ],
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      'direct',
    );

    await expect(workflowWriteFile(dist, name, 'task1', 'unknown-key', 'content', config)).rejects.toThrow(
      "Unknown key 'unknown-key'",
    );
  });

  it('write-file rejects unknown task', async () => {
    const name = workflowCreate(dist, 'debo-test', 'Test', []);
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

    await expect(workflowWriteFile(dist, name, 'nope', 'key', 'content', config)).rejects.toThrow(
      'Task not found: nope',
    );
  });

  it('workflow done rejects when file not yet written (no validation_result)', async () => {
    const name = workflowCreate(dist, 'debo-test', 'Test', []);
    workflowPlan(
      dist,
      name,
      [
        {
          id: 'task1',
          title: 'T1',
          type: 'data',
          files: [{ path: '/x', key: 'myfile', validators: [] }],
        },
      ],
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      'direct',
    );

    await expect(() => workflowDone(dist, name, 'task1')).rejects.toThrow('not yet written');
  });
});

// ── write-file with git-worktree engine (writes to target directly) ─────────

describe('write-file pipeline (git-worktree engine, no real git)', () => {
  let dist: string;
  let config: DesignbookConfig;

  beforeEach(() => {
    dist = mkdtempSync(resolve(tmpdir(), 'wf-writefile-wt-'));
    config = { data: dist, technology: 'html', extensions: [] };
  });

  it('writes directly to target path (no stash)', async () => {
    const worktreeDir = resolve(dist, 'worktree');
    mkdirSync(worktreeDir, { recursive: true });
    const targetPath = resolve(worktreeDir, 'tokens.yml');

    const name = workflowCreate(dist, 'debo-test', 'Test', []);
    workflowPlan(
      dist,
      name,
      [
        {
          id: 'task1',
          title: 'T1',
          type: 'tokens',
          files: [{ path: targetPath, key: 'tokens', validators: [] }],
        },
      ],
      undefined,
      undefined,
      worktreeDir,
      dist,
      'workflow/test',
      'git-worktree',
    );

    const content = 'color:\n  primary:\n    $value: "#00f"\n    $type: color\n';
    const result = await workflowWriteFile(dist, name, 'task1', 'tokens', content, config);

    expect(result.valid).toBe(true);
    // Git-worktree writes directly to target path
    expect(result.file_path).toBe(targetPath);
    expect(existsSync(targetPath)).toBe(true);
    expect(readFileSync(targetPath, 'utf-8')).toBe(content);
  });
});

// ── direct engine flush ─────────────────────────────────────────────────────

describe('direct engine flush', () => {
  let dist: string;
  let config: DesignbookConfig;

  beforeEach(() => {
    dist = mkdtempSync(resolve(tmpdir(), 'wf-flush-'));
    config = { data: dist, technology: 'html', extensions: [] };
  });

  it('flush moves stash files to target and applies utime', async () => {
    const targetPath = resolve(dist, 'output', 'tokens.yml');

    const name = workflowCreate(dist, 'debo-test', 'Test', []);
    workflowPlan(
      dist,
      name,
      [
        {
          id: 'task1',
          title: 'T1',
          type: 'tokens',
          step: 'create-tokens',
          stage: 'execute',
          files: [{ path: targetPath, key: 'tokens', validators: [] }],
        },
        {
          id: 'task2',
          title: 'T2',
          type: 'test',
          step: 'visual-diff',
          stage: 'test',
        },
      ],
      { execute: { steps: ['create-tokens'] }, test: { steps: ['visual-diff'] } },
      undefined,
      undefined,
      undefined,
      undefined,
      'direct',
    );

    // Write file — stashed at target dir with .debo suffix
    const content = 'tokens: true';
    const writeResult = await workflowWriteFile(dist, name, 'task1', 'tokens', content, config);

    // File is at target dir with .debo suffix, not at final target
    expect(existsSync(targetPath)).toBe(false);
    expect(writeResult.file_path).toMatch(/\.debo$/);
    expect(existsSync(writeResult.file_path)).toBe(true);

    // Mark task done — triggers stage transition execute→test which flushes
    const doneResult = await workflowDone(dist, name, 'task1');
    expect(doneResult.archived).toBe(false); // test task still pending

    // After flush: .debo renamed to final target path
    expect(existsSync(targetPath)).toBe(true);
    expect(readFileSync(targetPath, 'utf-8')).toBe(content);

    // .debo file should be gone after flush (renamed in-place)
    expect(existsSync(writeResult.file_path)).toBe(false);
  });
});

// ── direct engine cleanup (abandon) ──────────────────────────────────────────

describe('direct engine cleanup on abandon', () => {
  let dist: string;
  let config: DesignbookConfig;

  beforeEach(() => {
    dist = mkdtempSync(resolve(tmpdir(), 'wf-cleanup-'));
    config = { data: dist, technology: 'html', extensions: [] };
  });

  it('abandon removes .debo files for the workflow', async () => {
    const targetPath = resolve(dist, 'output', 'tokens.yml');
    const name = workflowCreate(dist, 'debo-test', 'Test', []);
    workflowPlan(
      dist,
      name,
      [
        {
          id: 'task1',
          title: 'T1',
          type: 'tokens',
          files: [{ path: targetPath, key: 'tokens', validators: [] }],
        },
      ],
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      'direct',
    );

    // Write file — creates .debo stash file
    const writeResult = await workflowWriteFile(dist, name, 'task1', 'tokens', 'content', config);
    expect(existsSync(writeResult.file_path)).toBe(true);

    // Abandon workflow — should clean up .debo files
    workflowAbandon(dist, name);
    expect(existsSync(writeResult.file_path)).toBe(false);
  });

  it('abandon does not remove .debo files from other workflows', async () => {
    const outputDir = resolve(dist, 'output');
    mkdirSync(outputDir, { recursive: true });
    const targetPath = resolve(outputDir, 'tokens.yml');

    // Create two workflows
    const name1 = workflowCreate(dist, 'debo-test', 'Test 1', []);
    const name2 = workflowCreate(dist, 'debo-test', 'Test 2', []);

    workflowPlan(
      dist,
      name1,
      [{ id: 'task1', title: 'T1', type: 'tokens', files: [{ path: targetPath, key: 'tokens', validators: [] }] }],
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      'direct',
    );
    workflowPlan(
      dist,
      name2,
      [{ id: 'task1', title: 'T1', type: 'tokens', files: [{ path: targetPath, key: 'tokens', validators: [] }] }],
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      'direct',
    );

    // Write files for both workflows
    const result1 = await workflowWriteFile(dist, name1, 'task1', 'tokens', 'content1', config);
    const result2 = await workflowWriteFile(dist, name2, 'task1', 'tokens', 'content2', config);

    expect(existsSync(result1.file_path)).toBe(true);
    expect(existsSync(result2.file_path)).toBe(true);

    // Abandon workflow 1 — should only remove its .debo file
    workflowAbandon(dist, name1);
    expect(existsSync(result1.file_path)).toBe(false);
    expect(existsSync(result2.file_path)).toBe(true);
  });
});
