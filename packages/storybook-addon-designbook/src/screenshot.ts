/**
 * Screenshot module — captures Storybook scene screenshots via Playwright,
 * downloads design references, and generates pixel diffs.
 *
 * Supports:
 * - --scene <group>:<name> — resolve scene file, find story_id, screenshot
 * - --reference — download design reference from scene's `reference` field
 * - --diff — pixel-diff between screenshot and reference using odiff
 */

import { resolve, dirname, basename } from 'node:path';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { parse as parseYaml } from 'yaml';
import { glob } from 'glob';
import type { DesignbookConfig } from './config.js';

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

interface ScreenshotResult {
  scene: string;
  storyId: string;
  screenshotPath: string;
  referencePath?: string;
  diffPath?: string;
  diff?: {
    mismatch: number;
    pixels: number;
    dimensions: {
      storybook: [number, number];
      reference: [number, number];
    };
  };
}

/**
 * Resolve a scene identifier to a scenes.yml file path and scene entry.
 *
 * Patterns:
 * - "design-system:shell" → design-system/design-system.scenes.yml → scene "shell"
 * - "galerie:product-detail" → sections/galerie/galerie.section.scenes.yml → scene "product-detail"
 * - "galerie" (no colon) → all scenes in sections/galerie/
 */
function resolveScene(
  dist: string,
  sceneRef: string,
): { filePath: string; scenes: SceneEntry[]; allScenes: ScenesFile } {
  const parts = sceneRef.split(':');
  const group = parts[0];
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
      filePath = matches[0];
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
async function resolveStoryId(
  storybookUrl: string,
  scenesFilePath: string,
  sceneName: string,
  configRoot: string,
): Promise<string> {
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
 * Take a Playwright screenshot of a Storybook story.
 */
function takeScreenshot(storybookUrl: string, storyId: string, outputPath: string): void {
  mkdirSync(dirname(outputPath), { recursive: true });

  // Find playwright binary — check pnpm hoisted location and node_modules
  const searchPaths = [
    resolve(process.cwd(), 'node_modules/.bin/playwright'),
    resolve(process.cwd(), 'node_modules/playwright/cli.js'),
  ];

  // Also search in pnpm's .pnpm directory
  const pnpmPlaywright = glob.sync(
    resolve(process.cwd(), 'node_modules/.pnpm/playwright@*/node_modules/playwright/cli.js'),
  );
  searchPaths.push(...pnpmPlaywright);

  let playwrightCmd = '';
  for (const p of searchPaths) {
    if (existsSync(p)) {
      playwrightCmd = p.endsWith('.js') ? `node "${p}"` : `"${p}"`;
      break;
    }
  }

  if (!playwrightCmd) {
    throw new Error('Playwright not found. Install it with: npm install playwright');
  }

  const url = `${storybookUrl}/iframe.html?id=${storyId}&viewMode=story`;

  execSync(
    `${playwrightCmd} screenshot --full-page --viewport-size "2560,1600" --wait-for-timeout 3000 "${url}" "${outputPath}"`,
    { stdio: 'pipe' },
  );
}

/**
 * Download a reference image based on the scene's reference field.
 */
async function downloadReference(reference: SceneEntry['reference'], outputPath: string): Promise<void> {
  if (!reference) {
    throw new Error('Scene has no reference field. Add a reference to the scene in the scenes.yml file.');
  }

  mkdirSync(dirname(outputPath), { recursive: true });

  if (reference.type === 'image') {
    // Direct image URL — download with fetch
    const res = await fetch(reference.url);
    if (!res.ok) throw new Error(`Failed to download reference image: HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    writeFileSync(outputPath, buffer);
  } else if (reference.type === 'stitch') {
    // Stitch screen — need to resolve screenshot URL via the resource name
    // The URL field contains the screen resource name, we need to fetch the screenshot URL
    // For now, try to fetch it as a direct image URL with =w2560 suffix
    const screenshotUrl = reference.url.startsWith('http')
      ? reference.url
      : `https://lh3.googleusercontent.com/aida/${reference.url}=w2560`;

    const res = await fetch(screenshotUrl);
    if (!res.ok) {
      throw new Error(
        `Failed to download Stitch reference. The reference URL may need MCP resolution.\n` +
          `URL: ${reference.url}\nHTTP: ${res.status}`,
      );
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    writeFileSync(outputPath, buffer);
  } else if (reference.type === 'figma') {
    throw new Error(`Figma reference type not yet supported. URL: ${reference.url}`);
  } else {
    throw new Error(`Unknown reference type: ${reference.type}`);
  }
}

/**
 * Run pixel diff between two images using odiff.
 */
async function runDiff(
  screenshotPath: string,
  referencePath: string,
  diffPath: string,
): Promise<{ mismatch: number; pixels: number }> {
  mkdirSync(dirname(diffPath), { recursive: true });

  // Use odiff-bin's Node API
  const { compare } = await import('odiff-bin');
  const result = await compare(screenshotPath, referencePath, diffPath);

  if (result.match) {
    return { mismatch: 0, pixels: 0 };
  }

  if (result.reason === 'pixel-diff') {
    return {
      mismatch: result.diffPercentage ?? 0,
      pixels: result.diffCount ?? 0,
    };
  }

  // layout-diff or other reasons
  return { mismatch: 100, pixels: 0 };
}

/**
 * Get image dimensions using identify or file inspection.
 */
function getImageDimensions(filePath: string): [number, number] {
  try {
    const result = execSync(`identify -format "%w %h" "${filePath}"`, { stdio: 'pipe', encoding: 'utf-8' });
    const [w, h] = result.trim().split(' ').map(Number);
    return [w, h];
  } catch {
    return [0, 0];
  }
}

/**
 * Main screenshot command handler.
 */
export async function screenshot(
  config: DesignbookConfig,
  opts: {
    scene: string;
    reference?: boolean;
    diff?: boolean;
  },
): Promise<void> {
  const storybookUrl = config.storybook_url as string | undefined;
  if (!storybookUrl) {
    throw new Error('storybook_url not configured in designbook.config.yml');
  }

  const configRoot = (config['storybook_root'] as string | undefined) ?? process.cwd();
  const dist = config.dist;

  // Resolve scene(s)
  const { filePath, scenes } = resolveScene(dist, opts.scene);
  const screenshotsDir = resolve(dirname(filePath), 'screenshots');

  const results: ScreenshotResult[] = [];

  for (const scene of scenes) {
    const name = scene.name;
    const screenshotPath = resolve(screenshotsDir, `${name}.png`);

    // 1. Resolve story ID
    let storyId: string;
    try {
      storyId = await resolveStoryId(storybookUrl, filePath, name, configRoot);
    } catch (err) {
      console.error(`Error resolving story ID for "${name}": ${(err as Error).message}`);
      continue;
    }

    // 2. Take screenshot
    try {
      takeScreenshot(storybookUrl, storyId, screenshotPath);
    } catch (err) {
      console.error(`Error taking screenshot for "${name}": ${(err as Error).message}`);
      continue;
    }

    const result: ScreenshotResult = { scene: name, storyId, screenshotPath };

    // 3. Download reference (if --reference or --diff)
    if (opts.reference || opts.diff) {
      const referencePath = resolve(screenshotsDir, `${name}.reference.png`);
      try {
        await downloadReference(scene.reference, referencePath);
        result.referencePath = referencePath;
      } catch (err) {
        console.error(`Error downloading reference for "${name}": ${(err as Error).message}`);
      }
    }

    // 4. Run diff (if --diff and reference was downloaded)
    if (opts.diff && result.referencePath) {
      const diffPath = resolve(screenshotsDir, `${name}.diff.png`);
      try {
        const diffResult = await runDiff(screenshotPath, result.referencePath, diffPath);
        result.diffPath = diffPath;
        result.diff = {
          ...diffResult,
          dimensions: {
            storybook: getImageDimensions(screenshotPath),
            reference: getImageDimensions(result.referencePath),
          },
        };
      } catch (err) {
        console.error(`Error running diff for "${name}": ${(err as Error).message}`);
      }
    }

    results.push(result);
  }

  // Output JSON results
  console.log(JSON.stringify(results, null, 2));
}
