/**
 * Skill source primitives for Designbook.
 *
 * Project skills live under `<skillsRoot>/skills/<skill>/` (resolved by
 * `resolveSkillsRoot(configDir)`); skill packages (npm packages, path entries,
 * the bundled skills) use the same `skills/<skill>/` layout under their root.
 * Merging the layers lives in `skill-resolver.ts`.
 */

import { existsSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { resolveSkillsRoot } from './config.js';

/**
 * A resolved skill content root.
 *
 * - `name` is the skill name (e.g. `designbook`, `designbook-css-tailwind`).
 * - `root` is the absolute directory directly containing the skill's
 *   `workflows/`, `tasks/`, `rules/`, `blueprints/` and schema files. The glob
 *   patterns used against a source are anchored at `root` WITHOUT a `skills/`
 *   prefix (unlike the project `agentsDir`).
 */
export interface SkillSource {
  name: string;
  root: string;
  /**
   * Where the source came from.
   * - `project`: discovered under `<skillsRoot>/skills/<name>` — already covered by
   *   the project `agentsDir` glob (`skills/**`), so resolvers skip these.
   * - `plugin`: from a skill package (`skills` config entry or the bundled
   *   skills) — resolvers glob these directly (no `skills/` prefix).
   */
  origin: 'project' | 'plugin';
}

function isDir(p: string): boolean {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function listDirs(dir: string): string[] {
  try {
    return readdirSync(dir).filter((c) => isDir(resolve(dir, c)));
  } catch {
    return [];
  }
}

/** Sources of a skill package: one per child dir of `<root>/skills/`. */
export function packageSkillSources(root: string): SkillSource[] {
  const skillsDir = resolve(root, 'skills');
  return listDirs(skillsDir).map((name) => ({ name, root: resolve(skillsDir, name), origin: 'plugin' as const }));
}

/**
 * Build project-layout skill sources from the resolved skills root.
 * For each child dir `D` of `<skillsRoot>/skills/`, emits `{ name: basename(D), root: D }`.

 */
export function resolveProjectSkillSources(configDir: string): SkillSource[] {
  const skillsRoot = resolveSkillsRoot(configDir);
  const skillsDir = resolve(skillsRoot, 'skills');
  if (!existsSync(skillsDir)) return [];
  const sources: SkillSource[] = [];
  for (const child of listDirs(skillsDir)) {
    sources.push({ name: child, root: resolve(skillsDir, child), origin: 'project' });
  }
  return sources;
}
