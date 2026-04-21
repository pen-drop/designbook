/**
 * CLI integration test for `workflow config --var <NAME>`.
 *
 * Exercises the subcommand through Commander (in-process). Verifies:
 *  - Happy path: returns the resolved value of a single DESIGNBOOK_* env var
 *  - Error path: unknown variable exits non-zero with stderr message
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'node:path';
import { setupCliSandbox, type CliSandbox } from './helpers.js';

describe('cli: workflow config --var', () => {
  let sandbox: CliSandbox;

  beforeEach(() => {
    // dirs.css is resolved by loadConfig() against the config dir (= tmpRoot),
    // then buildEnvMap() exposes it as DESIGNBOOK_DIRS_CSS.
    sandbox = setupCliSandbox({
      dirs: { css: 'css' },
    });
  });

  afterEach(() => {
    sandbox.cleanup();
    vi.restoreAllMocks();
  });

  it('returns a single variable value to stdout', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await sandbox.program.parseAsync(['node', 'cli', 'workflow', 'config', '--var', 'DESIGNBOOK_DIRS_CSS']);

    expect(process.exitCode).toBeFalsy();

    const lines = logSpy.mock.calls.flat().filter((c): c is string => typeof c === 'string');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe(join(sandbox.tmpRoot, 'css'));
  });

  it('exits non-zero and writes to stderr on unknown var', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await sandbox.program.parseAsync(['node', 'cli', 'workflow', 'config', '--var', 'DESIGNBOOK_DOES_NOT_EXIST']);

    expect(process.exitCode).toBe(1);

    const errText = errSpy.mock.calls
      .flat()
      .filter((c): c is string => typeof c === 'string')
      .join('\n');
    expect(errText.toLowerCase()).toMatch(/unknown/);
  });
});
