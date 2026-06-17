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
 * A `DESIGNBOOK_SKILLS` env var (colon-separated absolute paths) carries one or
 * more plugin content roots. Given the primary `designbook` root, the sibling
 * skills are auto-discovered (same hash, different skill-name dir).
 */

import { existsSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
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
   * - `env`: derived from `DESIGNBOOK_SKILLS` — resolvers glob these directly.
   */
  origin: 'project' | 'env';
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
    let isDir = false;
    try {
      isDir = statSync(childDir).isDirectory();
    } catch {
      isDir = false;
    }
    if (!isDir) continue;
    for (const sub of ARTIFACT_SUBDIRS) {
      if (existsSync(resolve(childDir, sub))) return true;
    }
  }
  return false;
}

/**
 * Derive the full set of skill sources from a single `DESIGNBOOK_SKILLS` entry.
 *
 * Algorithm (plugin layout):
 * - `hash = basename(E)`, `skillDir = dirname(E)`, `mpDir = dirname(skillDir)`.
 * - Primary skill: `{ name: basename(skillDir), root: E }`.
 * - Siblings: every existing dir matching `<mpDir>/<skill>/<hash>` (same hash,
 *   different skill-name dir) that looks like a skill content root.
 *
 * Fallback (non-plugin layout — no matching siblings, e.g. `E=/foo/myskill`):
 * a single source `{ name: basename(E), root: E }`.
 */
export function deriveSkillSourcesFromEntry(entry: string): SkillSource[] {
  const E = resolve(entry);
  if (!existsSync(E)) return [];

  const hash = basename(E);
  const skillDir = dirname(E);
  const mpDir = dirname(skillDir);

  const siblings: SkillSource[] = [];
  let skillNameDirs: string[] = [];
  try {
    skillNameDirs = readdirSync(mpDir);
  } catch {
    skillNameDirs = [];
  }

  for (const skillName of skillNameDirs) {
    const candidate = resolve(mpDir, skillName, hash);
    if (candidate === E) continue;
    if (!existsSync(candidate)) continue;
    if (!isSkillContentRoot(candidate)) continue;
    siblings.push({ name: basename(dirname(candidate)), root: candidate, origin: 'env' });
  }

  // Non-plugin layout: no same-hash siblings → a single source named after E.
  if (siblings.length === 0) {
    return [{ name: basename(E), root: E, origin: 'env' }];
  }

  // Plugin layout: primary skill (named after its skill-name dir) plus siblings.
  return [{ name: basename(skillDir), root: E, origin: 'env' }, ...siblings];
}

/** Parse the `DESIGNBOOK_SKILLS` env var into a list of source roots (colon-separated). */
export function parseSkillsEnv(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(':')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Build env-derived skill sources from `DESIGNBOOK_SKILLS` (or an explicit value).
 * Each entry is expanded via {@link deriveSkillSourcesFromEntry}. Deduped by name
 * (first entry wins).
 */
export function resolveEnvSkillSources(envValue?: string): SkillSource[] {
  const raw = envValue ?? process.env['DESIGNBOOK_SKILLS'];
  const entries = parseSkillsEnv(raw);
  const byName = new Map<string, SkillSource>();
  for (const entry of entries) {
    for (const src of deriveSkillSourcesFromEntry(entry)) {
      if (!byName.has(src.name)) byName.set(src.name, src);
    }
  }
  return Array.from(byName.values());
}

/**
 * Build project-layout skill sources from the resolved skills root.
 * For each child dir `D` of `<skillsRoot>/skills/`, emits `{ name: basename(D), root: D }`.
 */
export function resolveProjectSkillSources(configDir: string): SkillSource[] {
  const skillsRoot = resolveSkillsRoot(configDir);
  const skillsDir = resolve(skillsRoot, 'skills');
  if (!existsSync(skillsDir)) return [];
  let children: string[];
  try {
    children = readdirSync(skillsDir);
  } catch {
    return [];
  }
  const sources: SkillSource[] = [];
  for (const child of children) {
    const dir = resolve(skillsDir, child);
    try {
      if (!statSync(dir).isDirectory()) continue;
    } catch {
      continue;
    }
    sources.push({ name: child, root: dir, origin: 'project' });
  }
  return sources;
}

/**
 * Build the full ordered skill source list for a config dir.
 *
 * Precedence: project sources override env sources with the same `name`
 * (a project can locally override a plugin skill). Project sources come first
 * in the returned list; env sources with names already provided by a project
 * source are dropped.
 *
 * @param configDir - Directory used to resolve the project skills root.
 * @param envValue - Optional explicit `DESIGNBOOK_SKILLS` value (defaults to env).
 */
export function resolveSkillSources(configDir: string, envValue?: string): SkillSource[] {
  const projectSources = resolveProjectSkillSources(configDir);
  const envSources = resolveEnvSkillSources(envValue);

  const byName = new Map<string, SkillSource>();
  for (const src of projectSources) byName.set(src.name, src);
  for (const src of envSources) {
    if (!byName.has(src.name)) byName.set(src.name, src);
  }
  return Array.from(byName.values());
}
