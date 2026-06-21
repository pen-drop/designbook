import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { load as parseYaml } from 'js-yaml';
import type { DataModel } from './types';

/** One per-bundle file's parsed records. */
export interface BundleFile {
  entityType: string;
  bundle: string;
  records: Record<string, unknown>[];
}

/**
 * Look a bundle up in the data model and return its namespace.
 * Returns 'content', 'config', or null when the bundle is unknown.
 */
export function namespaceFor(dataModel: DataModel, entityType: string, bundle: string): 'content' | 'config' | null {
  if (dataModel.content?.[entityType]?.[bundle]) return 'content';
  if (dataModel.config?.[entityType]?.[bundle]) return 'config';
  return null;
}

/**
 * Read every `data/<entity_type>.<bundle>.yml` file in `dataDir`.
 * Each file holds a bare record array. Non-array files and files whose
 * basename has no `.` separator are skipped with a warning.
 * Returns [] when `dataDir` does not exist. No fallback to any other path.
 */
export function readBundleFiles(dataDir: string): BundleFile[] {
  if (!existsSync(dataDir)) return [];

  const out: BundleFile[] = [];
  for (const file of readdirSync(dataDir)) {
    if (!file.endsWith('.yml')) continue;
    const base = file.slice(0, -'.yml'.length);
    const dot = base.indexOf('.');
    if (dot < 1) {
      console.warn(`[Designbook] data/${file}: name must be <entity_type>.<bundle>.yml — skipped`);
      continue;
    }
    const records = parseYaml(readFileSync(join(dataDir, file), 'utf-8'));
    if (!Array.isArray(records)) {
      console.warn(`[Designbook] data/${file}: expected a record array — skipped`);
      continue;
    }
    out.push({
      entityType: base.slice(0, dot),
      bundle: base.slice(dot + 1),
      records: records as Record<string, unknown>[],
    });
  }
  return out;
}
