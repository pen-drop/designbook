import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, cpSync } from 'node:fs';
import { resolve } from 'node:path';
import { setupCliSandbox, type CliSandbox } from './helpers.js';

function seedDiscoveryFixtures(sandbox: CliSandbox): void {
  const agentsDir = resolve(sandbox.tmpRoot, '.agents');
  mkdirSync(agentsDir, { recursive: true });
  cpSync(resolve(__dirname, 'fixtures', 'discovery', 'skills'), resolve(agentsDir, 'skills'), {
    recursive: true,
  });
}

describe('cli: workflow definitions', () => {
  let sandbox: CliSandbox;

  beforeEach(() => {
    sandbox = setupCliSandbox();
    seedDiscoveryFixtures(sandbox);
  });

  afterEach(() => {
    sandbox.cleanup();
    vi.restoreAllMocks();
  });

  it('prints all workflow ids sorted, one per line, when called with no positional', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await sandbox.program.parseAsync(['node', 'cli', 'workflow', 'definitions']);

    expect(process.exitCode).toBeFalsy();
    const lines = logSpy.mock.calls.flat().filter((c): c is string => typeof c === 'string');
    expect(lines).toEqual(['alpha-flow', 'beta-flow']);
  });

  it('prints JSON with stages and steps for a known workflow id', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await sandbox.program.parseAsync(['node', 'cli', 'workflow', 'definitions', 'beta-flow']);

    expect(process.exitCode).toBeFalsy();
    const output = logSpy.mock.calls
      .flat()
      .filter((c): c is string => typeof c === 'string')
      .join('\n');
    const parsed = JSON.parse(output) as {
      id: string;
      file: string;
      stages: Array<{ name: string; steps: string[] }>;
    };
    expect(parsed.id).toBe('beta-flow');
    expect(parsed.file).toMatch(/skills\/beta\/workflows\/beta-flow\.md$/);
    expect(parsed.stages).toEqual([
      { name: 'intake', steps: ['intake-beta'] },
      { name: 'produce', steps: ['produce-first', 'produce-second'] },
      { name: 'outtake', steps: ['outtake-beta'] },
    ]);
  });

  it('exits 1 with stderr error for an unknown workflow id', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await sandbox.program.parseAsync(['node', 'cli', 'workflow', 'definitions', 'does-not-exist']);

    expect(process.exitCode).toBe(1);
    const errText = errSpy.mock.calls
      .flat()
      .filter((c): c is string => typeof c === 'string')
      .join('\n');
    expect(errText).toMatch(/does-not-exist/);
  });
});
