/**
 * resolve-url module — resolves scene references to Storybook iframe URLs.
 *
 * Extracted from screenshot.ts. Supports:
 * - --scene <group>:<name> — resolve scene file, find story_id, return URL
 * - --file <path> --scene <name> — resolve from explicit file path
 */

import { resolve, basename } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { load as parseYaml } from 'js-yaml';
import { glob } from 'glob';
import type { DesignbookConfig } from './config.js';
import { StorybookDaemon } from './storybook.js';

interface IndexEntry {
  id: string;
  type: string;
  importPath: string;
  title: string;
  name: string;
}

interface SceneEntry {
  name: string;
  reference?: {
    type: string;
    url: string;
    title?: string;
    screens?: Record<string, string>;
  };
  items?: unknown[];
}

interface ScenesFile {
  id: string;
  title: string;
  group?: string;
  name?: string;
  scenes?: SceneEntry[];
}

export interface ResolveUrlResult {
  scene: string;
  storyId: string;
  url: string;
  filePath: string;
}

/**
 * Resolve a scene identifier to a scenes.yml file path and scene entry.
 *
 * Patterns:
 * - "design-system:shell" → design-system/design-system.scenes.yml → scene "shell"
 * - "galerie:product-detail" → sections/galerie/galerie.section.scenes.yml → scene "product-detail"
 * - "galerie" (no colon) → all scenes in sections/galerie/
 */
export function resolveScene(
  dist: string,
  sceneRef: string,
): { filePath: string; scenes: SceneEntry[]; allScenes: ScenesFile } {
  const parts = sceneRef.split(':');
  const group = parts[0]!;
  const sceneName = parts[1]; // may be undefined

  // Try design-system path first
  let filePath = resolve(dist, 'design-system', `${group}.scenes.yml`);
  if (!existsSync(filePath)) {
    // Try design-system with design-system prefix
    filePath = resolve(dist, group, `${group}.scenes.yml`);
  }
  if (!existsSync(filePath)) {
    // Try sections path
    const sectionGlob = resolve(dist, 'sections', group, '*.section.scenes.yml');
    const matches = glob.sync(sectionGlob);
    if (matches.length > 0) {
      filePath = matches[0]!;
    }
  }

  if (!existsSync(filePath)) {
    throw new Error(
      `No scenes file found for "${group}". Tried:\n  - ${dist}/design-system/${group}.scenes.yml\n  - ${dist}/${group}/${group}.scenes.yml\n  - ${dist}/sections/${group}/*.section.scenes.yml`,
    );
  }

  const content = readFileSync(filePath, 'utf-8');
  const parsed = parseYaml(content) as ScenesFile;
  const allScenes = parsed.scenes ?? [];

  if (sceneName) {
    const matched = allScenes.filter((s) => s.name === sceneName);
    if (matched.length === 0) {
      const available = allScenes.map((s) => s.name).join(', ');
      throw new Error(`Scene "${sceneName}" not found in ${filePath}. Available: ${available}`);
    }
    return { filePath, scenes: matched, allScenes: parsed };
  }

  return { filePath, scenes: allScenes, allScenes: parsed };
}

/**
 * Fetch the Storybook index and find the story ID for a scenes file.
 */
export async function resolveStoryId(storybookUrl: string, scenesFilePath: string, sceneName: string): Promise<string> {
  const res = await fetch(`${storybookUrl}/index.json`);
  if (!res.ok) {
    throw new Error(`Storybook index returned ${res.status}. Is Storybook running at ${storybookUrl}?`);
  }

  const index = (await res.json()) as { entries: Record<string, IndexEntry> };
  const entries = Object.values(index.entries ?? {});

  const fileName = basename(scenesFilePath);

  // Find entries matching this scenes file
  const matching = entries.filter((e) => {
    if (e.type === 'docs') return false;
    return e.importPath.endsWith(fileName);
  });

  // Among matching entries, find the one with the right scene name
  const sceneEntry = matching.find((e) => {
    const storyName = e.id.split('--').pop();
    return storyName === sceneName || e.name.toLowerCase() === sceneName.toLowerCase();
  });

  if (sceneEntry) return sceneEntry.id;

  // Fallback: search all entries for scene name
  const fallback = entries.find((e) => {
    if (e.type === 'docs') return false;
    const storyName = e.id.split('--').pop();
    return storyName === sceneName;
  });

  if (fallback) return fallback.id;

  throw new Error(
    `No Storybook entry found for scene "${sceneName}" (file: ${fileName}).\n` +
      `Found ${matching.length} entries for this file: ${matching.map((e) => e.id).join(', ') || 'none'}`,
  );
}

/**
 * Main resolve-url command handler.
 */
export async function resolveUrl(
  config: DesignbookConfig,
  opts: {
    scene: string;
    file?: string;
  },
): Promise<void> {
  const baseUrl = config['designbook.url'] as string | undefined;
  if (!baseUrl) {
    throw new Error('designbook.url not configured in designbook.config.yml');
  }

  // Resolve URL with active port from storybook.json
  const dataDir = config['designbook.data'] as string | undefined;
  const sb = dataDir ? new StorybookDaemon(dataDir, baseUrl) : undefined;
  const storybookUrl = sb?.url ?? baseUrl;

  let filePath: string;
  let scenes: SceneEntry[];

  if (opts.file) {
    // Explicit file path + scene name
    const content = readFileSync(opts.file, 'utf-8');
    const parsed = parseYaml(content) as ScenesFile;
    filePath = opts.file;
    const allScenes = parsed.scenes ?? [];
    const sceneName = opts.scene;
    const matched = allScenes.filter((s) => s.name === sceneName);
    if (matched.length === 0) {
      const available = allScenes.map((s) => s.name).join(', ');
      throw new Error(`Scene "${sceneName}" not found in ${opts.file}. Available: ${available}`);
    }
    scenes = matched;
  } else {
    const resolved = resolveScene(config.data, opts.scene);
    filePath = resolved.filePath;
    scenes = resolved.scenes;
  }

  const results: ResolveUrlResult[] = [];

  for (const scene of scenes) {
    const name = scene.name;
    let storyId: string;
    try {
      storyId = await resolveStoryId(storybookUrl, filePath, name);
    } catch (err) {
      console.error(`Error resolving story ID for "${name}": ${(err as Error).message}`);
      continue;
    }

    const url = `${storybookUrl}/iframe.html?id=${storyId}&viewMode=story`;
    results.push({ scene: name, storyId, url, filePath });
  }

  console.log(JSON.stringify(results, null, 2));
}
