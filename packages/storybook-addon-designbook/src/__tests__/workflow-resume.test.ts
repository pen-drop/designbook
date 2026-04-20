import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { dump as dumpYaml, load as parseYaml } from 'js-yaml';
import { workflowResume } from '../workflow.js';

describe('workflowResume', () => {
  let dataDir: string;
  let workflowName: string;
  let tasksYmlPath: string;

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), 'wf-resume-'));
    workflowName = 'test-wf-2026-04-20-abcd';
    const dir = join(dataDir, 'workflows', 'changes', workflowName);
    mkdirSync(dir, { recursive: true });
    tasksYmlPath = join(dir, 'tasks.yml');
  });

  afterEach(() => rmSync(dataDir, { recursive: true, force: true }));

  it('transitions waiting → running and clears waiting_message', () => {
    writeFileSync(
      tasksYmlPath,
      dumpYaml({ status: 'waiting', waiting_message: 'Preview OK?', tasks: [], stages: {} }),
    );
    workflowResume(dataDir, workflowName);
    const raw = parseYaml(readFileSync(tasksYmlPath, 'utf-8')) as { status: string; waiting_message?: string };
    expect(raw.status).toBe('running');
    expect(raw.waiting_message).toBeUndefined();
  });

  it('is a no-op if workflow is already running', () => {
    writeFileSync(tasksYmlPath, dumpYaml({ status: 'running', tasks: [], stages: {} }));
    expect(() => workflowResume(dataDir, workflowName)).not.toThrow();
    const raw = parseYaml(readFileSync(tasksYmlPath, 'utf-8')) as { status: string };
    expect(raw.status).toBe('running');
  });

  it('throws if workflow is completed', () => {
    writeFileSync(tasksYmlPath, dumpYaml({ status: 'completed', tasks: [], stages: {} }));
    expect(() => workflowResume(dataDir, workflowName)).toThrow(/completed/);
  });

  it('throws if workflow does not exist', () => {
    expect(() => workflowResume(dataDir, 'nonexistent-wf')).toThrow(/not found/i);
  });
});
