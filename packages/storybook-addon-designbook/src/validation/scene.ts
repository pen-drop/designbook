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
import type { DesignbookConfig } from '../shared/config.js';
import type { ValidationFileResult } from '../shared/workflow-types.js';
import { buildSceneModule } from '../scene-model/scene-module-builder.js';

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

  // Reserved scene names: every scenes file gets an auto-generated `overview`
  // story export (the DeboSectionPage / section overview). A scene named
  // "overview" produces a second `export const overview` in the same module,
  // collides with that reserved export, and silently renders the section page
  // instead of the scene. Reject it so the workflow renames the scene.
  const RESERVED_SCENE_NAMES = new Set(['overview']);
  for (const scene of raw.scenes as Array<Record<string, unknown>>) {
    const name = typeof scene?.name === 'string' ? scene.name.trim().toLowerCase() : '';
    if (RESERVED_SCENE_NAMES.has(name)) {
      return {
        file,
        type: 'scene',
        valid: false,
        error: `Scene name "${(scene.name as string)?.trim()}" is reserved — every scenes file already exports an "overview" story (the section overview page). A scene named "overview" collides with it and renders the section page instead of the scene. Rename the scene (e.g. to the section id or a descriptive label like "default").`,
        last_validated: ts,
        last_failed: ts,
      };
    }
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
