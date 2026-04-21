/**
 * CLI integration test for `workflow resume`.
 *
 * Exercises the subcommand through Commander (in-process) — not the library
 * function directly. Verifies:
 *  - Happy path: waiting → running transition + JSON output + tasks.yml change
 *  - Error path: non-existent workflow exits non-zero with stderr error
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { dump as dumpYaml, load as parseYaml } from 'js-yaml';
import { setupCliSandbox, type CliSandbox } from './helpers.js';

describe('cli: workflow resume', () => {
  let sandbox: CliSandbox;
  let workflowName: string;
  let tasksYmlPath: string;

  beforeEach(() => {
    sandbox = setupCliSandbox();

    workflowName = 'test-wf-2026-04-20-abcd';
    const dir = join(sandbox.dataDir, 'workflows', 'changes', workflowName);
    mkdirSync(dir, { recursive: true });
    tasksYmlPath = join(dir, 'tasks.yml');
  });

  afterEach(() => {
    sandbox.cleanup();
    vi.restoreAllMocks();
  });

  it('transitions waiting → running, prints JSON, updates tasks.yml on disk', async () => {
    writeFileSync(
      tasksYmlPath,
      dumpYaml({
        status: 'waiting',
        waiting_message: 'Preview OK?',
        tasks: [],
        stages: {},
      }),
    );

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await sandbox.program.parseAsync(['node', 'cli', 'workflow', 'resume', '--workflow', workflowName]);

    // No non-zero exit code set
    expect(process.exitCode).toBeFalsy();

    // stdout contains valid JSON with { status: 'running', workflow: <name> }
    const calls = logSpy.mock.calls.flat();
    expect(calls.length).toBeGreaterThan(0);
    const jsonLine = calls.find((c) => typeof c === 'string' && c.startsWith('{')) as string | undefined;
    expect(jsonLine).toBeDefined();
    const parsed = JSON.parse(jsonLine!) as { status: string; workflow: string };
    expect(parsed).toEqual({ status: 'running', workflow: workflowName });

    // tasks.yml on disk: status: running, no waiting_message
    const raw = parseYaml(readFileSync(tasksYmlPath, 'utf-8')) as {
      status: string;
      waiting_message?: string;
    };
    expect(raw.status).toBe('running');
    expect(raw.waiting_message).toBeUndefined();
  });

  it('exits non-zero and writes to stderr when the workflow does not exist', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await sandbox.program.parseAsync(['node', 'cli', 'workflow', 'resume', '--workflow', 'does-not-exist']);

    expect(process.exitCode).toBe(1);

    const errText = errSpy.mock.calls
      .flat()
      .filter((c): c is string => typeof c === 'string')
      .join('\n');
    expect(errText.toLowerCase()).toMatch(/not found/);
  });
});
