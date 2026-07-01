import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, cpSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Command } from 'commander';
import { setupCliSandbox, type CliSandbox } from './helpers.js';
import { register as registerRunbook } from '../runbook.js';

function seedFixtures(sandbox: CliSandbox): void {
  const agentsDir = resolve(sandbox.tmpRoot, '.agents');
  mkdirSync(agentsDir, { recursive: true });
  cpSync(resolve(__dirname, '..', '..', 'runbook', '__tests__', 'fixtures', 'skills'), resolve(agentsDir, 'skills'), {
    recursive: true,
  });
}

function programWithRunbook(): Command {
  const program = new Command();
  program.exitOverride();
  registerRunbook(program);
  return program;
}

describe('cli: runbook <workflow>', () => {
  let sandbox: CliSandbox;

  beforeEach(() => {
    sandbox = setupCliSandbox();
    seedFixtures(sandbox);
  });

  afterEach(() => {
    sandbox.cleanup();
    vi.restoreAllMocks();
  });

  it('writes the resolved markdown runbook to stdout for a known workflow', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const program = programWithRunbook();
    await program.parseAsync(['node', 'cli', 'runbook', 'example']);

    expect(process.exitCode).toBeFalsy();
    const output = logSpy.mock.calls
      .flat()
      .filter((c): c is string => typeof c === 'string')
      .join('\n');
    expect(output).toMatch(/^# Runbook: Example/);
    expect(output).toContain('## Stage 1 — reference');
    expect(output).toContain('## Stage 3 — polish');
    expect(output).toContain('## Rule: format');
    expect(output).toContain('## Blueprint: style');
    expect(output).toMatch(/\*Iteration\*: 1 task per item in `issues`/);
  });

  it('exits non-zero with stderr on unknown workflow id', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const program = programWithRunbook();
    await program.parseAsync(['node', 'cli', 'runbook', 'does-not-exist']);

    expect(process.exitCode).toBe(1);
    const errText = errSpy.mock.calls
      .flat()
      .filter((c): c is string => typeof c === 'string')
      .join('\n');
    expect(errText).toMatch(/workflow.*does-not-exist|not found/i);
  });

  it('exits non-zero on a resolution error inside the workflow', async () => {
    writeFileSync(
      resolve(sandbox.tmpRoot, '.agents/skills/example/workflows/example.md'),
      `---
title: Broken
description: ""
stages:
  reference:
    steps: [no-such-step]
engine: direct
---
`,
    );
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const program = programWithRunbook();
    await program.parseAsync(['node', 'cli', 'runbook', 'example']);

    expect(process.exitCode).toBe(1);
    const errText = errSpy.mock.calls
      .flat()
      .filter((c): c is string => typeof c === 'string')
      .join('\n');
    expect(errText.length).toBeGreaterThan(0);
  });
});
