/**
 * Skill source resolution for Designbook.
 *
 * Designbook skills can live in two layouts:
 *
 * 1. **Project layout** (dev repo / consumer override): under a single skills
 *    root resolved by `resolveSkillsRoot(configDir)` →
 *    `<skillsRoot>/skills/<skill>/.../{workflows,tasks,rules,blueprints}/`.
 *
 * 2. **Plugin-cache layout** (Claude Code plugin install): each skill lives in
 *    its own hashed cache directory, e.g.
 *    `~/.claude/plugins/cache/designbook/designbook/<hash>/css-generate/workflows/...`
 *    Here the skill content root IS the directory directly containing the
 *    `workflows/`, `tasks/`, `rules/`, `blueprints/` and `*.yml` schema files —
 *    there is no `skills/` prefix and no skill-name segment inside.
 *
 * The plugin-cache roots are discovered from the `skills` config key: a lookup
 * base (typically the marketplace cache dir `~/.claude/plugins/cache/designbook`).
 * The CLI scans `<base>/<skill>/<hash>` and, when several hashes coexist after a
 * plugin update, picks the newest-mtime one per skill. Project-local skills of
 * the same name always override the plugin copy.
 */

import { existsSync, readdirSync, statSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { loadConfig, resolveSkillsRoot } from './config.js';

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
   * - `plugin`: derived from the `skills` config lookup root — resolvers glob
   *   these directly (no `skills/` prefix).
   */
  origin: 'project' | 'plugin';
}

const ARTIFACT_SUBDIRS = ['workflows', 'tasks', 'rules', 'blueprints'] as const;

/** Whether a directory looks like a skill content root (has any artifact subdir, possibly one level deep). */
function isSkillContentRoot(dir: string): boolean {
  if (!existsSync(dir)) return false;
  for (const sub of ARTIFACT_SUBDIRS) {
    if (existsSync(resolve(dir, sub))) return true;
  }
  // Concern-nested layout: <root>/<concern>/{workflows,tasks,...}
  let children: string[];
  try {
    children = readdirSync(dir);
  } catch {
    return false;
  }
  for (const child of children) {
    const childDir = resolve(dir, child);
    if (!isDir(childDir)) continue;
    for (const sub of ARTIFACT_SUBDIRS) {
      if (existsSync(resolve(childDir, sub))) return true;
    }
  }
  return false;
}

function isDir(p: string): boolean {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function mtimeMs(p: string): number {
  try {
    return statSync(p).mtimeMs;
  } catch {
    return 0;
  }
}

function listDirs(dir: string): string[] {
  try {
    return readdirSync(dir).filter((c) => isDir(resolve(dir, c)));
  } catch {
    return [];
  }
}

/**
 * Derive skill sources from a lookup base directory.
 *
 * Layout precedence:
 * 1. **Marketplace** — `<base>/<skill>/<hash>` where the hash dir is a content
 *    root. One source per skill; when multiple hashes coexist (e.g. an old +
 *    new plugin install), the newest-mtime hash wins.
 * 2. **Flat skills** — `<base>/<skill>` is itself a content root.
 * 3. **Single** — `<base>` itself is a content root → one source named after it.
 */
export function deriveSkillSourcesFromBase(base: string): SkillSource[] {
  const B = resolve(base);
  if (!existsSync(B)) return [];

  const sources: SkillSource[] = [];
  for (const skillName of listDirs(B)) {
    const skillDir = resolve(B, skillName);

    // Marketplace layout: pick the newest-mtime hash dir that is a content root.
    const hashRoots = listDirs(skillDir)
      .map((h) => resolve(skillDir, h))
      .filter(isSkillContentRoot);
    if (hashRoots.length > 0) {
      const best = hashRoots.reduce((a, b) => (mtimeMs(b) > mtimeMs(a) ? b : a));
      sources.push({ name: skillName, root: best, origin: 'plugin' });
      continue;
    }

    // Flat layout: the skill-name dir is itself a content root.
    if (isSkillContentRoot(skillDir)) {
      sources.push({ name: skillName, root: skillDir, origin: 'plugin' });
    }
  }

  if (sources.length > 0) return sources;

  // Single layout: the base itself is a content root.
  if (isSkillContentRoot(B)) return [{ name: basename(B), root: B, origin: 'plugin' }];

  return [];
}

/**
 * Build plugin-layout skill sources from the `skills` config lookup root.
 * Returns `[]` when the config has no `skills` key.
 */
export function resolveConfigSkillSources(configDir: string): SkillSource[] {
  let skills: unknown;
  try {
    skills = loadConfig(configDir)['skills'];
  } catch {
    return [];
  }
  if (typeof skills !== 'string' || skills.length === 0) return [];
  return deriveSkillSourcesFromBase(skills);
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

/**
 * Build the full ordered skill source list for a config dir.
 *
 * Precedence: project sources override plugin sources with the same `name`
 * (a project can locally override a plugin skill). Project sources come first
 * in the returned list; plugin sources whose names are already provided by a
 * project source are dropped.
 *
 * @param configDir - Directory used to resolve the project skills root and config.
 */
export function resolveSkillSources(configDir: string): SkillSource[] {
  const projectSources = resolveProjectSkillSources(configDir);
  const pluginSources = resolveConfigSkillSources(configDir);

  const byName = new Map<string, SkillSource>();
  for (const src of projectSources) byName.set(src.name, src);
  for (const src of pluginSources) {
    if (!byName.has(src.name)) byName.set(src.name, src);
  }
  return Array.from(byName.values());
}
