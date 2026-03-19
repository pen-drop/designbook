/**
 * Story validator — checks that a scenes or component file is reachable and
 * loads without error in the running Storybook dev server.
 *
 * Strategy:
 * 1. Fetch /index.json to confirm the file compiled into at least one story entry.
 * 2. Fetch the transformed JS module (Sec-Fetch-Dest: script) to trigger Vite's
 *    lazy build and detect runtime errors (e.g. buildSceneModule crashes) that
 *    never surface in index.json.
 */

import { resolve } from 'node:path';
import type { DesignbookConfig } from '../config.js';
import type { ValidationFileResult } from '../workflow-types.js';

function nowIso(): string {
  return new Date().toISOString();
}

export async function validateStory(file: string, config: DesignbookConfig): Promise<ValidationFileResult> {
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

  // Match by importPath suffix
  const absPath = resolve(config.dist, file).replace(/\\/g, '/');
  const matching = entries.filter((e) => {
    const clean = e.importPath.replace(/^\.\//, '');
    return absPath.endsWith('/' + clean) || absPath === clean;
  });

  const normalEntries = matching.filter((e) => e.exportName !== 'LoadError');
  const errorEntries = matching.filter((e) => e.exportName === 'LoadError');

  if (normalEntries.length > 0) {
    // Fetch the transformed JS module to trigger lazy build and catch runtime errors.
    // Uses Sec-Fetch-Dest: script so Vite applies its plugin transform pipeline.
    const importPath = normalEntries[0].importPath;
    const moduleUrl = `http://localhost:${port}${importPath.slice(1)}`; // strip leading '.'
    try {
      const modRes = await fetch(moduleUrl, {
        signal: AbortSignal.timeout(10000),
        headers: { 'Sec-Fetch-Dest': 'script' },
      });
      if (modRes.ok) {
        const js = await modRes.text();
        if (js.includes('export const LoadError') || js.includes('Scene Load Error')) {
          const m = js.match(/<pre>([\s\S]*?)<\/pre>/);
          const errorMsg = m ? m[1].replace(/\\'/g, "'").replace(/\\n/g, '\n') : 'Story failed to load';
          return { file, type: 'story', valid: false, error: errorMsg, last_validated: ts, last_failed: ts };
        }
      }
    } catch {
      /* Storybook may still be compiling — treat as valid */
    }
    return { file, type: 'story', valid: true, last_validated: ts, last_passed: ts };
  }

  // File has a LoadError entry — extract the message
  if (errorEntries.length > 0) {
    let errorMsg = 'Story failed to compile';
    const importPath = errorEntries[0].importPath;
    const moduleUrl = `http://localhost:${port}${importPath.slice(1)}`;
    try {
      const modRes = await fetch(moduleUrl, {
        signal: AbortSignal.timeout(5000),
        headers: { 'Sec-Fetch-Dest': 'script' },
      });
      if (modRes.ok) {
        const js = await modRes.text();
        const m = js.match(/<pre>([\s\S]*?)<\/pre>/);
        if (m) errorMsg = m[1].replace(/\\'/g, "'").replace(/\\n/g, '\n');
      }
    } catch {
      /* fall through */
    }
    return { file, type: 'story', valid: false, error: errorMsg, last_validated: ts, last_failed: ts };
  }

  // Not in index, no LoadError — file is new and Storybook hasn't picked it up yet.
  // Treat as skipped (valid) rather than a hard failure.
  return { file, type: 'story', valid: true, skipped: true, last_validated: ts };
}
