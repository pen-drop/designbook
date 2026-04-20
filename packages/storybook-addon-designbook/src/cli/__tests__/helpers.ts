/**
 * In-process CLI test harness.
 *
 * Spins up a disposable tmpdir containing a minimal `designbook.config.yml`,
 * chdirs into it so `loadConfig()` (which walks up from cwd) finds the file,
 * and wires a fresh Commander program with the `workflow` subcommands
 * registered. Tests drive the program via `program.parseAsync([...])`.
 *
 * Relies on Vitest's default per-file isolation (forks pool) — do not switch
 * to the threads pool, because cwd manipulation is not worker-safe.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Command } from 'commander';
import { dump as dumpYaml } from 'js-yaml';
import { register as registerWorkflow } from '../workflow.js';

export interface CliSandbox {
  /** Absolute path to the sandbox workspace root (also cwd while active). */
  tmpRoot: string;
  /** Absolute path to the resolved DESIGNBOOK_DATA dir (tmpRoot/designbook). */
  dataDir: string;
  /** Fresh Commander program with workflow subcommands registered. */
  program: Command;
  /** Restore cwd, clear process.exitCode, and remove the tmp sandbox. */
  cleanup: () => void;
}

/**
 * Create a fresh CLI sandbox.
 *
 * @param configFields - Extra keys to merge into the generated
 *   `designbook.config.yml`. Keys are written verbatim (nested objects are
 *   flattened by `loadConfig()` into dot-path keys like `dirs.css`).
 *   Example: `{ dirs: { css: 'css' } }` produces a `dirs.css` entry that
 *   `loadConfig()` resolves to `<tmpRoot>/css`, which `buildEnvMap()` then
 *   exposes as `DESIGNBOOK_DIRS_CSS`.
 */
export function setupCliSandbox(configFields?: Record<string, unknown>): CliSandbox {
  const tmpRoot = mkdtempSync(join(tmpdir(), 'cli-sandbox-'));
  const dataDir = join(tmpRoot, 'designbook');
  mkdirSync(dataDir, { recursive: true });

  // Minimal designbook.config.yml that loadConfig() accepts. The `designbook.data`
  // key (written nested so flatten() produces `designbook.data`) tells loadConfig
  // to resolve `data` to `<tmpRoot>/designbook`.
  const configYml: Record<string, unknown> = {
    designbook: { data: 'designbook' },
    ...(configFields ?? {}),
  };
  writeFileSync(join(tmpRoot, 'designbook.config.yml'), dumpYaml(configYml));

  const previousCwd = process.cwd();
  process.chdir(tmpRoot);

  const previousExitCode = process.exitCode;
  process.exitCode = undefined;

  const program = new Command();
  program.exitOverride(); // throw instead of process.exit on commander errors
  registerWorkflow(program);

  return {
    tmpRoot,
    dataDir,
    program,
    cleanup: () => {
      process.chdir(previousCwd);
      process.exitCode = previousExitCode;
      rmSync(tmpRoot, { recursive: true, force: true });
    },
  };
}
