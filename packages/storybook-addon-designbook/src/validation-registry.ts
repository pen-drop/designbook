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

// ── Helpers ───────────────────────────────────────────────────────────────────

type ValidatorResult = { valid: boolean; errors: string[]; warnings?: string[] };

function toFileResult(result: ValidatorResult, file: string, type: string): ValidationFileResult {
  const ts = new Date().toISOString();
  return {
    file,
    type,
    valid: result.valid,
    error: result.valid ? undefined : result.errors.join('; '),
    last_validated: ts,
    last_passed: result.valid ? ts : undefined,
    last_failed: result.valid ? undefined : ts,
  };
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

defaultRegistry.register('**/*.component.yml', async (file) => {
  return Promise.resolve(toFileResult(validateComponent(file), file, 'component'));
});
defaultRegistry.register('**/data-model.yml', (file) =>
  Promise.resolve(toFileResult(validateDataModel(file), file, 'data-model')),
);
defaultRegistry.register('**/design-tokens.yml', (file) =>
  Promise.resolve(toFileResult(validateTokens(file), file, 'tokens')),
);
defaultRegistry.register('**/data.yml', (file, config) =>
  Promise.resolve(toFileResult(validateData(resolve(config.data, 'data-model.yml'), file), file, 'data')),
);
defaultRegistry.register('**/*.jsonata', async (file, config) => {
  const { validateEntityMapping } = await import('./validators/entity-mapping.js');
  return toFileResult(await validateEntityMapping(file, config), file, 'entity-mapping');
});
// CSS generation expression files are build artifacts, not entity mappings — skip validation
defaultRegistry.register('**/designbook-css-*/generate-*.jsonata', (file) =>
  Promise.resolve({
    file,
    type: 'css-expression',
    valid: true,
    skipped: true,
    last_validated: new Date().toISOString(),
  }),
);
defaultRegistry.register('**/*.scenes.yml', async (file, config) => {
  const { validateSceneBuild } = await import('./validators/scene.js');
  return validateSceneBuild(file, config);
});
