/**
 * Validator key registry — maps validator keys to validator functions.
 * Replaces the old glob-pattern-based ValidationRegistry.
 */

import { resolve } from 'node:path';
import { execSync } from 'node:child_process';
import type { DesignbookConfig } from './config.js';
import type { ValidationFileResult } from './workflow-types.js';
import { validateData } from './validators/data.js';
import { validateImage } from './validators/image.js';

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
  // JSON-Schema-only validators (component, data-model, tokens) removed —
  // schema validation now happens via $ref on result: declarations (see workflowResult).
  data: async (file, config) => toFileResult(validateData(resolve(config.data, 'data-model.yml'), file), file, 'data'),
  'entity-mapping': async (file, config) => {
    const { validateEntityMapping } = await import('./validators/entity-mapping.js');
    return toFileResult(await validateEntityMapping(file, config), file, 'entity-mapping');
  },
  scene: async (file, config) => {
    const { validateSceneBuild, validateSceneAgainstInventory } = await import('./validators/scene.js');
    const buildResult = await validateSceneBuild(file, config);
    if (!buildResult.valid) return buildResult;
    // Safety-net: re-check component ids against live inventory.
    try {
      const { load: parseYaml } = await import('js-yaml');
      const { readFileSync, existsSync } = await import('node:fs');
      if (!existsSync(file)) return buildResult;
      const raw = parseYaml(readFileSync(file, 'utf-8'));
      const inv = await validateSceneAgainstInventory(raw, { config });
      if (!inv.valid) {
        const ts = new Date().toISOString();
        return {
          file,
          type: 'scene',
          valid: false,
          error: inv.errors.join('; '),
          last_validated: ts,
          last_failed: ts,
        };
      }
      return buildResult;
    } catch {
      return buildResult;
    }
  },
  image: async (file) => toFileResult(validateImage(file), file, 'image'),
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
    // cmd: prefix — execute shell command as validator
    if (key.startsWith('cmd:')) {
      const cmdTemplate = key.slice(4);
      const cmd = cmdTemplate.replace(/\{\{\s*file\s*\}\}/g, file);
      const ts = new Date().toISOString();
      try {
        execSync(cmd, { timeout: 30_000, stdio: ['pipe', 'pipe', 'pipe'] });
        lastResult = { file, type: 'cmd', valid: true, last_validated: ts, last_passed: ts };
      } catch (err: unknown) {
        const execErr = err as { status?: number; stderr?: Buffer };
        const stderr = execErr.stderr?.toString().trim() ?? '';
        const exitCode = execErr.status ?? 1;
        const errorMsg = stderr || `Command failed with exit code ${exitCode}`;
        lastResult = { file, type: 'cmd', valid: false, error: errorMsg, last_validated: ts, last_failed: ts };
        return lastResult;
      }
      continue;
    }

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
