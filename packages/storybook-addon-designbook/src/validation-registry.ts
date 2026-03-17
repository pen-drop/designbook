/**
 * ValidationRegistry — maps glob patterns to validator functions.
 * Last registration wins, allowing integrations to override built-in validators.
 */

import { resolve } from 'node:path';
import { minimatch } from 'minimatch';
import type { DesignbookConfig } from './config.js';
import type { ValidationFileResult } from './workflow-types.js';
import { validateComponent } from './validators/component.js';
import { validateDataModel } from './validators/data-model.js';
import { validateTokens } from './validators/tokens.js';
import { validateData } from './validators/data.js';

export type ValidatorFn = (file: string, config: DesignbookConfig) => Promise<ValidationFileResult>;

export interface ValidatorRegistration {
  pattern: string | string[];
  validate: ValidatorFn;
}

export class ValidationRegistry {
  private entries: Array<{ patterns: string[]; validate: ValidatorFn }> = [];

  register(pattern: string | string[], validate: ValidatorFn): void {
    const patterns = Array.isArray(pattern) ? pattern : [pattern];
    this.entries.push({ patterns, validate });
  }

  async validate(file: string, config: DesignbookConfig): Promise<ValidationFileResult> {
    // Last registration wins — iterate in reverse
    for (let i = this.entries.length - 1; i >= 0; i--) {
      const entry = this.entries[i];
      const matches = entry.patterns.some((p) => minimatch(file, p, { dot: true, matchBase: false }));
      if (matches) {
        return entry.validate(file, config);
      }
    }
    return {
      file,
      type: 'unknown',
      valid: true,
      skipped: true,
      last_validated: new Date().toISOString(),
    };
  }
}

// ── Built-in validator adapters ──────────────────────────────────────────────

function nowIso(): string {
  return new Date().toISOString();
}

async function validateComponentFile(file: string): Promise<ValidationFileResult> {
  const result = validateComponent(file);
  const ts = nowIso();
  return {
    file,
    type: 'component',
    valid: result.valid,
    error: result.valid ? undefined : result.errors.join('; '),
    last_validated: ts,
    last_passed: result.valid ? ts : undefined,
    last_failed: result.valid ? undefined : ts,
  };
}

async function validateDataModelFile(file: string): Promise<ValidationFileResult> {
  const result = validateDataModel(file);
  const ts = nowIso();
  return {
    file,
    type: 'data-model',
    valid: result.valid,
    error: result.valid ? undefined : result.errors.join('; '),
    last_validated: ts,
    last_passed: result.valid ? ts : undefined,
    last_failed: result.valid ? undefined : ts,
  };
}

async function validateTokensFile(file: string): Promise<ValidationFileResult> {
  const result = validateTokens(file);
  const ts = nowIso();
  return {
    file,
    type: 'tokens',
    valid: result.valid,
    error: result.valid ? undefined : result.errors.join('; '),
    last_validated: ts,
    last_passed: result.valid ? ts : undefined,
    last_failed: result.valid ? undefined : ts,
  };
}

async function validateDataFile(file: string, config: DesignbookConfig): Promise<ValidationFileResult> {
  const dataModelPath = resolve(config.dist, 'data-model.yml');
  const result = validateData(dataModelPath, file);
  const ts = nowIso();
  return {
    file,
    type: 'data',
    valid: result.valid,
    error: result.valid ? undefined : result.errors.join('; '),
    last_validated: ts,
    last_passed: result.valid ? ts : undefined,
    last_failed: result.valid ? undefined : ts,
  };
}

async function validateViewModeFile(file: string, config: DesignbookConfig): Promise<ValidationFileResult> {
  const { validateViewMode } = await import('./validators/view-mode.js');
  const result = await validateViewMode(file, config);
  const ts = nowIso();
  return {
    file,
    type: 'view-mode',
    valid: result.valid,
    error: result.valid ? undefined : result.errors.join('; '),
    last_validated: ts,
    last_passed: result.valid ? ts : undefined,
    last_failed: result.valid ? undefined : ts,
  };
}

/**
 * Validate a story or scenes file by checking Storybook's /index.json.
 * - If normal story entries are found for the file → valid.
 * - If only error entries (LoadError from buildErrorModule) → tries to fetch the module
 *   source to extract the error message.
 * - If no entries found → invalid.
 * - Returns skipped:true if Storybook is not reachable.
 */
export async function validateViaStorybookHttp(file: string, config: DesignbookConfig): Promise<ValidationFileResult> {
  const port = (config['storybook.port'] as number | undefined) ?? 6009;
  const ts = nowIso();

  type IndexEntry = { id: string; importPath: string; name: string; exportName?: string };
  let entries: IndexEntry[];
  try {
    const indexRes = await fetch(`http://localhost:${port}/index.json`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!indexRes.ok) {
      return { file, type: 'story', valid: true, skipped: true, last_validated: ts };
    }
    const indexJson = (await indexRes.json()) as { entries?: Record<string, IndexEntry> };
    entries = Object.values(indexJson.entries ?? {});
  } catch {
    return { file, type: 'story', valid: true, skipped: true, last_validated: ts };
  }

  // Compute absolute path for importPath suffix matching
  const absPath = resolve(config.dist, file).replace(/\\/g, '/');
  const matching = entries.filter((e) => {
    const clean = e.importPath.replace(/^\.\//, '');
    return absPath.endsWith('/' + clean) || absPath === clean;
  });

  // Normal entries: anything that isn't a LoadError placeholder from buildErrorModule
  const normalEntries = matching.filter((e) => e.exportName !== 'LoadError');
  const errorEntries = matching.filter((e) => e.exportName === 'LoadError');

  if (normalEntries.length > 0) {
    return { file, type: 'story', valid: true, last_validated: ts, last_passed: ts };
  }

  // No normal entries — try to extract the error message
  let errorMsg = 'File not found in Storybook index — story may not have compiled';

  if (errorEntries.length > 0) {
    // buildErrorModule was used — fetch the module source to read the embedded error
    const importPath = errorEntries[0].importPath;
    const moduleUrl = `http://localhost:${port}${importPath.slice(1)}`; // strip leading '.'
    try {
      const modRes = await fetch(moduleUrl, { signal: AbortSignal.timeout(5000) });
      if (modRes.ok) {
        const js = await modRes.text();
        const m = js.match(/<pre>([\s\S]*?)<\/pre>/);
        if (m) {
          errorMsg = m[1].replace(/\\'/g, "'").replace(/\\n/g, '\n');
        }
      }
    } catch {
      /* fall through to generic message */
    }
  }

  return { file, type: 'story', valid: false, error: errorMsg, last_validated: ts, last_failed: ts };
}

// ── Config-based extension ───────────────────────────────────────────────────

/**
 * Register command-based validators from `validate.patterns` in designbook.config.yml.
 *
 * Example config:
 * ```yaml
 * validate:
 *   patterns:
 *     "**\/*.vue":
 *       command: "vue-validator {file}"
 * ```
 */
export function applyConfigExtensions(config: DesignbookConfig, registry: ValidationRegistry): void {
  const patterns = config['validate.patterns'] as Record<string, { command: string }> | undefined;
  if (!patterns) return;

  for (const [pattern, opts] of Object.entries(patterns)) {
    if (typeof opts?.command !== 'string') continue;

    const command = opts.command;
    registry.register(pattern, async (file): Promise<ValidationFileResult> => {
      const { execFile } = await import('node:child_process');
      const { promisify } = await import('node:util');
      const execAsync = promisify(execFile);

      const cmd = command.replace('{file}', file);
      const ts = new Date().toISOString();

      try {
        await execAsync('sh', ['-c', cmd]);
        return { file, type: 'unknown', valid: true, last_validated: ts, last_passed: ts };
      } catch (err) {
        const message = (err as NodeJS.ErrnoException & { stderr?: string }).stderr || (err as Error).message;
        return { file, type: 'unknown', valid: false, error: message, last_validated: ts, last_failed: ts };
      }
    });
  }
}

// ── Default registry with built-in validators ────────────────────────────────

export const defaultRegistry = new ValidationRegistry();

defaultRegistry.register('**/*.component.yml', validateComponentFile);
defaultRegistry.register('**/data-model.yml', validateDataModelFile);
defaultRegistry.register('**/design-tokens.yml', validateTokensFile);
defaultRegistry.register('**/data.yml', validateDataFile);
defaultRegistry.register('**/*.jsonata', validateViewModeFile);
defaultRegistry.register(['**/*.story.yml', '**/*.scenes.yml'], validateViaStorybookHttp);
