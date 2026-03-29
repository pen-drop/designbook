/**
 * Scene build validator — validates a *.scenes.yml file by running the actual
 * build pipeline (buildSceneModule). If the build throws, the scene is invalid.
 *
 * This catches all build-time errors: type mismatches, missing refs, JSONata
 * failures, and anything else that would crash the Vite plugin at load time.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { load as parseYaml } from 'js-yaml';
import type { DesignbookConfig } from '../config.js';
import type { ValidationFileResult } from '../workflow-types.js';
import { buildSceneModule } from '../renderer/scene-module-builder.js';

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Derive the designbook directory from the file path.
 * Walks up from the file until it finds a directory containing data-model.yml
 * or a designbook.config.yml, falling back to config.data.
 */
function findDesignbookDir(file: string, config: DesignbookConfig): string {
  let dir = dirname(resolve(file));
  for (let i = 0; i < 10; i++) {
    if (existsSync(resolve(dir, 'data-model.yml'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return config.data;
}

export async function validateSceneBuild(file: string, config: DesignbookConfig): Promise<ValidationFileResult> {
  const ts = nowIso();

  if (!existsSync(file)) {
    return { file, type: 'scene', valid: false, error: `File not found: ${file}`, last_validated: ts, last_failed: ts };
  }

  let raw: Record<string, unknown>;
  try {
    raw = parseYaml(readFileSync(file, 'utf-8')) as Record<string, unknown>;
  } catch (err) {
    return {
      file,
      type: 'scene',
      valid: false,
      error: `YAML parse error: ${(err as Error).message}`,
      last_validated: ts,
      last_failed: ts,
    };
  }

  if (!raw || !Array.isArray(raw.scenes) || raw.scenes.length === 0) {
    // No scenes to build — not an error, just nothing to validate
    return { file, type: 'scene', valid: true, last_validated: ts, last_passed: ts };
  }

  const designbookDir = findDesignbookDir(file, config);

  try {
    await buildSceneModule(file, raw, designbookDir, {});
    return { file, type: 'scene', valid: true, last_validated: ts, last_passed: ts };
  } catch (err) {
    return {
      file,
      type: 'scene',
      valid: false,
      error: (err as Error).message,
      last_validated: ts,
      last_failed: ts,
    };
  }
}
