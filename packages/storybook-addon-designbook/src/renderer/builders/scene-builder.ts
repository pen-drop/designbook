/**
 * Scene Builder — resolves `type: 'scene'` nodes.
 *
 * Enables scene composition — a scene can reference another scene by ref,
 * optionally filling $variable placeholders declared in the template via `with:`.
 *
 * ref format: "source:sceneName" (e.g. "test:shell")
 *
 * Build logic:
 * 1. Parse ref → find <source>/*.scenes.yml, locate scene by name
 * 2. If `with:` provided, substitute $variable placeholders in raw SceneDef before building
 * 3. For each entry in scene.items: await ctx.buildNode(entry as SceneNode) → ComponentNode[]
 * 4. Return built ComponentNode[]
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import type {
  SceneNodeBuilder,
  SceneNode,
  BuildContext,
  RawNode,
  SceneSceneNode,
  SceneDef,
  ScenesFile,
} from '../types';

/** Recursively substitute $variable placeholders in a raw YAML object. */
function substitute(obj: unknown, vars: Record<string, unknown>): unknown {
  if (typeof obj === 'string' && obj.startsWith('$')) {
    const key = obj.slice(1);
    return key in vars ? vars[key] : obj;
  }
  if (Array.isArray(obj)) return obj.map((v) => substitute(v, vars));
  if (obj && typeof obj === 'object')
    return Object.fromEntries(Object.entries(obj as Record<string, unknown>).map(([k, v]) => [k, substitute(v, vars)]));
  return obj;
}

/**
 * Find a scenes file for a given source alias in the designbook directory.
 *
 * Resolution order:
 * 1. <designbookDir>/<source>.scenes.yml   — flat naming convention
 * 2. <designbookDir>/<source>/*.scenes.yml — subdirectory convention
 */
function findScenesFile(designbookDir: string, source: string): string | null {
  // 1. Direct flat match
  const directMatch = resolve(designbookDir, `${source}.scenes.yml`);
  if (existsSync(directMatch)) return directMatch;

  // 2. Subdirectory: first *.scenes.yml file in <designbookDir>/<source>/
  const subDir = resolve(designbookDir, source);
  if (existsSync(subDir)) {
    try {
      const files = readdirSync(subDir).filter((f) => f.endsWith('.scenes.yml'));
      if (files.length > 0) return join(subDir, files[0]!);
    } catch {
      // skip
    }
  }

  return null;
}

/** Find a specific scene by name in a scenes file path. */
function findScene(scenesFilePath: string, sceneName: string): SceneDef | null {
  try {
    const content = readFileSync(scenesFilePath, 'utf-8');
    const parsed = parseYaml(content) as ScenesFile;
    return parsed?.scenes?.find((s) => s.name === sceneName) ?? null;
  } catch {
    return null;
  }
}

export const sceneBuilder: SceneNodeBuilder = {
  appliesTo(node: SceneNode): boolean {
    return node.type === 'scene';
  },

  async build(node: SceneNode, ctx: BuildContext): Promise<RawNode[]> {
    const sceneNode = node as SceneSceneNode;
    const { ref } = sceneNode;

    // Read `with:` vars, accepting `slots:` as a deprecated alias
    let withVars: Record<string, unknown> | undefined = sceneNode.with;
    if (!withVars && sceneNode.slots) {
      console.warn(`[Designbook] SceneBuilder: "slots:" on scene ref "${ref}" is deprecated — use "with:" instead`);
      withVars = sceneNode.slots as Record<string, unknown>;
    }

    // Parse ref: "source:sceneName"
    const colonIdx = ref.indexOf(':');
    if (colonIdx === -1) {
      console.warn(`[Designbook] SceneBuilder: invalid ref format "${ref}" — expected "source:sceneName"`);
      return [];
    }
    const source = ref.slice(0, colonIdx);
    const sceneName = ref.slice(colonIdx + 1);

    // Find the scenes file for this source
    const scenesFile = findScenesFile(ctx.designbookDir, source);
    if (!scenesFile) {
      console.warn(`[Designbook] SceneBuilder: cannot find scenes file for source "${source}"`);
      return [];
    }

    // Find the scene by name
    let scene = findScene(scenesFile, sceneName);
    if (!scene) {
      console.warn(`[Designbook] SceneBuilder: scene "${sceneName}" not found in ${scenesFile}`);
      return [];
    }

    // Substitute $variable placeholders before building
    if (withVars) {
      scene = substitute(scene, withVars) as SceneDef;
    }

    // Build all items in the referenced scene
    const builtItems = [];
    for (const entry of scene.items) {
      const built = await ctx.buildNode(entry as SceneNode);
      builtItems.push(...built);
    }

    return builtItems;
  },
};
