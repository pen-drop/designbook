/**
 * Validator key registry — maps validator keys to validator functions.
 * Replaces the old glob-pattern-based ValidationRegistry.
 */

import { resolve } from 'node:path';
import type { DesignbookConfig } from './config.js';
import type { ValidationFileResult } from './workflow-types.js';
import { validateComponent } from './validators/component.js';
import { validateDataModel } from './validators/data-model.js';
import { validateTokens } from './validators/tokens.js';
import { validateData } from './validators/data.js';

export type ValidatorFn = (file: string, config: DesignbookConfig) => Promise<ValidationFileResult>;

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

// ── Validator Key Registry ──────────────────────────────────────────────────

const validators: Record<string, ValidatorFn> = {
  component: async (file) => toFileResult(validateComponent(file), file, 'component'),
  'data-model': async (file) => toFileResult(validateDataModel(file), file, 'data-model'),
  tokens: async (file) => toFileResult(validateTokens(file), file, 'tokens'),
  data: async (file, config) => toFileResult(validateData(resolve(config.data, 'data-model.yml'), file), file, 'data'),
  'entity-mapping': async (file, config) => {
    const { validateEntityMapping } = await import('./validators/entity-mapping.js');
    return toFileResult(await validateEntityMapping(file, config), file, 'entity-mapping');
  },
  scene: async (file, config) => {
    const { validateSceneBuild } = await import('./validators/scene.js');
    return validateSceneBuild(file, config);
  },
};

/**
 * Look up a validator function by key.
 * Returns undefined if the key is not registered.
 */
export function getValidator(key: string): ValidatorFn | undefined {
  return validators[key];
}

/**
 * Get all registered validator keys.
 */
export function getValidatorKeys(): string[] {
  return Object.keys(validators);
}

/**
 * Validate a file using the specified validator keys.
 * Runs all validators in sequence; returns the first failure or the last success.
 * If keys is empty, returns auto-pass (skipped).
 */
export async function validateByKeys(
  keys: string[],
  file: string,
  config: DesignbookConfig,
): Promise<ValidationFileResult> {
  if (keys.length === 0) {
    const ts = new Date().toISOString();
    return { file, type: 'unknown', valid: true, skipped: true, last_validated: ts };
  }

  let lastResult: ValidationFileResult | undefined;
  for (const key of keys) {
    const fn = validators[key];
    if (!fn) {
      const ts = new Date().toISOString();
      return {
        file,
        type: 'unknown',
        valid: false,
        error: `Unknown validator key: '${key}'. Available: ${Object.keys(validators).join(', ')}`,
        last_validated: ts,
        last_failed: ts,
      };
    }
    lastResult = await fn(file, config);
    if (!lastResult.valid) return lastResult;
  }

  return lastResult!;
}
