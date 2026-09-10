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

/**
 * Live-index scene inventory check, injected by the composition root (`cli.ts`)
 * rather than imported here. The inventory walk resolves the Storybook daemon,
 * which the validation module must never reach directly or transitively
 * (DESIGNBOOK-60 AC-2). When no checker is registered (e.g. unit tests, or any
 * headless run that never wires a daemon), scene validation is build-only.
 */
export type SceneInventoryChecker = (
  scene: unknown,
  context: { config: DesignbookConfig },
) => Promise<{ valid: boolean; errors: string[] }>;

let sceneInventoryChecker: SceneInventoryChecker | undefined;

export function registerSceneInventoryChecker(fn: SceneInventoryChecker): void {
  sceneInventoryChecker = fn;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

type ValidatorResult = { valid: boolean; errors: string[]; warnings?: string[] };

/**
 * POSIX shell-quote a value so it is inert when interpolated into a `cmd:`
 * validator template. The file path can carry AI/user-supplied segments, so an
 * unquoted substitution would allow command injection (spaces, `;`, `$(...)`).
 */
function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

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
  data: async (_file, config) =>
    toFileResult(
      validateData(resolve(config.data, 'data-model.yml'), resolve(config.data, 'data')),
      resolve(config.data, 'data'),
      'data',
    ),
  'entity-mapping': async (file, config) => {
    const { validateEntityMapping } = await import('./validators/entity-mapping.js');
    return toFileResult(await validateEntityMapping(file, config), file, 'entity-mapping');
  },
  scene: async (file, config) => {
    const { validateSceneBuild } = await import('./validators/scene.js');
    const buildResult = await validateSceneBuild(file, config);
    if (!buildResult.valid) return buildResult;

    // Safety-net: re-check component ids against the live inventory via the
    // injected checker (wired by cli.ts). Absent a checker — headless/unit
    // runs — scene validation is build-only. YAML re-parse failures fall
    // through to buildResult (validateSceneBuild would have caught them), but
    // inventory resolver crashes MUST surface as a scene failure — otherwise
    // the safety-net silently defeats itself.
    if (!sceneInventoryChecker) return buildResult;
    const { load: parseYaml } = await import('js-yaml');
    const { readFileSync, existsSync } = await import('node:fs');
    if (!existsSync(file)) return buildResult;
    let raw: unknown;
    try {
      raw = parseYaml(readFileSync(file, 'utf-8'));
    } catch {
      return buildResult;
    }
    const ts = new Date().toISOString();
    try {
      const inv = await sceneInventoryChecker(raw, { config });
      if (!inv.valid) {
        return { file, type: 'scene', valid: false, error: inv.errors.join('; '), last_validated: ts, last_failed: ts };
      }
      return buildResult;
    } catch (err) {
      return {
        file,
        type: 'scene',
        valid: false,
        error: `inventory check crashed: ${(err as Error).message}`,
        last_validated: ts,
        last_failed: ts,
      };
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
      const cmd = cmdTemplate.replace(/\{\{\s*file\s*\}\}/g, shellQuote(file));
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
