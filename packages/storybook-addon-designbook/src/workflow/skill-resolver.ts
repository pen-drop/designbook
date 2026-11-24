/**
 * Skill resolution for Designbook.
 *
 * Skills come from three layers, merged by skill name (first wins, a winner
 * replaces the whole skill):
 *
 * 1. project-local `<skillsRoot>/skills/<name>/` (e.g. `.agents/skills/`)
 * 2. `designbook.config.yml` `skills` entries, in listed order — each an npm
 *    package name (Node resolution from the config dir) or a path
 * 3. the skills bundled in this package (`dist/skills/`)
 *
 * Every non-project layer is a skill package: a dir with `skills/<name>/`.
 */

import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { type DesignbookConfig, loadConfig } from '../shared/config.js';
import { packageSkillSources, resolveProjectSkillSources, type SkillSource } from '../shared/skill-sources.js';
import { bundledSkillsRoot } from './bundled-skills.js';

/**
 * Resolve one `skills` entry to its package root. Paths (`.` or `/` prefix) are
 * taken relative to `configDir`; anything else is an npm package name looked up
 * along Node's `node_modules` chain from `configDir`. Throws naming the entry
 * when it is not found or has no `skills/` dir.
 */
export function resolveSkillEntry(entry: string, configDir: string): string {
  let root: string | undefined;
  if (/^[./]/.test(entry)) {
    root = resolve(configDir, entry);
  } else {
    // Walk the node_modules chain directly: `require.resolve(name/package.json)` fails when `exports` hides it.
    const dirs = createRequire(join(configDir, 'package.json')).resolve.paths(entry) ?? [];
    root = dirs.map((d) => join(d, entry)).find((d) => existsSync(join(d, 'package.json')));
  }
  if (!root || !existsSync(join(root, 'skills'))) {
    throw new Error(`skills entry '${entry}' not found: install it as an npm package or point to a dir with skills/`);
  }
  return root;
}

/**
 * Build the ordered skill source list for a config dir. `overrides` injects the
 * config and the bundled root (`null` = none) for testing.
 */
export function resolveSkillSources(
  configDir: string,
  overrides?: { config?: DesignbookConfig; bundledRoot?: string | null },
): SkillSource[] {
  const config = overrides?.config ?? loadConfig(configDir);
  const bundledRoot = overrides?.bundledRoot !== undefined ? overrides.bundledRoot : bundledSkillsRoot();
  const roots = (config.skills ?? []).map((entry) => resolveSkillEntry(entry, configDir));
  if (bundledRoot) roots.push(bundledRoot);

  if (process.env['DESIGNBOOK_DEBUG']) {
    for (const root of roots) process.stderr.write(`[designbook] skills: ${root}\n`);
  }

  const byName = new Map<string, SkillSource>();
  for (const src of [...resolveProjectSkillSources(configDir), ...roots.flatMap(packageSkillSources)]) {
    if (!byName.has(src.name)) byName.set(src.name, src);
  }
  return Array.from(byName.values());
}
