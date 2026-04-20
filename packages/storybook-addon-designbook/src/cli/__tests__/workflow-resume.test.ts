/**
 * CLI integration test for `workflow resume`.
 *
 * Exercises the subcommand through Commander (in-process) — not the library
 * function directly. Verifies:
 *  - Happy path: waiting → running transition + JSON output + tasks.yml change
 *  - Error path: non-existent workflow exits non-zero with stderr error
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { dump as dumpYaml, load as parseYaml } from 'js-yaml';
import { Command } from 'commander';
import { register as registerWorkflow } from '../workflow.js';

describe('cli: workflow resume', () => {
  let tmpRoot: string;
  let dataDir: string;
  let workflowName: string;
  let tasksYmlPath: string;
  let originalCwd: string;
  let exitCodeBefore: number | string | undefined;

  beforeEach(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'cli-wf-resume-'));
    dataDir = join(tmpRoot, 'designbook');
    mkdirSync(dataDir, { recursive: true });

    // Write a minimal designbook.config.yml so loadConfig() resolves data=dataDir.
    writeFileSync(
      join(tmpRoot, 'designbook.config.yml'),
      dumpYaml({
        designbook: { data: 'designbook' },
      }),
    );

    workflowName = 'test-wf-2026-04-20-abcd';
    const dir = join(dataDir, 'workflows', 'changes', workflowName);
    mkdirSync(dir, { recursive: true });
    tasksYmlPath = join(dir, 'tasks.yml');

    originalCwd = process.cwd();
    process.chdir(tmpRoot);

    exitCodeBefore = process.exitCode;
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.chdir(originalCwd);
    process.exitCode = exitCodeBefore as number | undefined;
    if (tmpRoot) rmSync(tmpRoot, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  function makeProgram(): Command {
    const program = new Command();
    program.exitOverride(); // throw instead of process.exit on commander errors
    registerWorkflow(program);
    return program;
  }

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

    const program = makeProgram();
    await program.parseAsync(['node', 'cli', 'workflow', 'resume', '--workflow', workflowName]);

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

    const program = makeProgram();
    await program.parseAsync(['node', 'cli', 'workflow', 'resume', '--workflow', 'does-not-exist']);

    expect(process.exitCode).toBe(1);

    const errText = errSpy.mock.calls
      .flat()
      .filter((c): c is string => typeof c === 'string')
      .join('\n');
    expect(errText.toLowerCase()).toMatch(/not found/);
  });
});
