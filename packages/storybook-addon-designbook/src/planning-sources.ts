/**
 * Planning source discovery.
 *
 * Answers one question: for a step, which task, rule and blueprint files apply?
 * Pure filesystem matching — globbing, trigger/filter conditions, precedence and
 * deduplication. Knows nothing about JSON Schema.
 */

import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import fm from 'front-matter';
import { globSync } from 'glob';
import { normalizeExtensions, getExtensionIds, getExtensionSkillIds, type DesignbookConfig } from './config.js';
import type { SkillSource } from './skill-sources.js';

export interface ResolvedFile {
  path: string;
  name: string;
  specificity: number;
  frontmatter: Record<string, unknown> | null;
}

// ── Plugin Skill Source Helpers ───────────────────────────────────────

/** Keep only plugin-origin sources — project layout is covered by the agentsDir glob. */
export function pluginSources(sources?: SkillSource[]): SkillSource[] {
  return (sources ?? []).filter((s) => s.origin === 'plugin');
}

/**
 * Strip the leading `skills/**\/` segment from a project glob pattern so it can
 * be globbed against a plugin SkillSource root (which has no `skills/` prefix and
 * no skill-name segment). E.g. `skills/**\/tasks/*.md` → `**\/tasks/*.md`.
 */
function toSourcePattern(globPattern: string): string {
  return globPattern.replace(/^skills\/\*\*\//, '**/');
}

/**
 * Derive a namespaced artifact name for a file found under a plugin SkillSource.
 *
 * The concern is the directory **directly containing** the kind dir
 * (`tasks/`|`rules/`|`blueprints/`|`workflows/`) — i.e. the segment two levels
 * above the artifact file. This holds for both the flat concern layout and the
 * nested sub-skill layout (`skills/<wf>/<kind>/<artifact>.md` → concern `<wf>`).
 *
 * - `<concern>/<kind>/<artifact>.md`        → `${name}:${concern}:${artifact}`
 * - `skills/<wf>/<kind>/<artifact>.md`      → `${name}:${wf}:${artifact}`
 * - flat `<kind>/<artifact>.md`             → `${name}:${artifact}`
 */
function derivePluginArtifactName(source: SkillSource, filePath: string): string {
  const rel = relative(source.root, filePath).replace(/\\/g, '/');
  const parts = rel.split('/');
  const artifact = (parts[parts.length - 1] ?? '').replace(/\.md$/, '');
  // <…>/<concern>/<kind>/<artifact>.md → 3+ segments
  if (parts.length >= 3) {
    const concern = parts[parts.length - 3]!;
    return `${source.name}:${concern}:${artifact}`;
  }
  // flat <kind>/<artifact>.md → 2 segments
  return `${source.name}:${artifact}`;
}

// ── Frontmatter Parsing ────────────────────────────────────────────

/**
 * Extract YAML frontmatter from a markdown file.
 * Returns parsed YAML object, or null if no frontmatter found.
 */
export function parseFrontmatter(filePath: string): Record<string, unknown> | null {
  const content = readFileSync(filePath, 'utf-8');
  const result = fm<Record<string, unknown>>(content);
  if (!result.frontmatter) return null;
  return result.attributes ?? {};
}

// ── Artifact Name Derivation ──────────────────────────────────────

/**
 * Derive namespaced artifact name from file path relative to agentsDir.
 *
 * Convention: `<skill>:<concern>:<artifact>` for nested skills,
 * `<skill>:<artifact>` for flat skills.
 *
 * The concern is the directory directly containing the kind dir — covering both
 * the flat concern layout (integration skills) and the nested sub-skill layout
 * (core skill: `skills/designbook/skills/<wf>/<kind>/x`).
 *
 * Examples:
 * - `skills/designbook/skills/tokens/tasks/create-tokens.md` → `designbook:tokens:create-tokens`  (nested sub-skill)
 * - `skills/designbook/design/tasks/capture-storybook.md` → `designbook:design:capture-storybook`  (shared content root, parent-level)
 * - `skills/designbook-stitch/tasks/stitch-inspect.md` → `designbook-stitch:stitch-inspect`
 * - `skills/designbook-drupal/components/rules/foo.md` → `designbook-drupal:components:foo`
 * - `skills/designbook-sdc/blueprints/component.md` with type=component, name=section → `designbook-sdc:blueprints:component/section`
 */
export function deriveArtifactName(
  filePath: string,
  agentsDir: string,
  frontmatter?: Record<string, unknown> | null,
  /**
   * When the file was discovered under an plugin SkillSource (not the project
   * `agentsDir`), pass the source so the namespace is derived from the source
   * name + the path relative to the source root, instead of relative to
   * `<agentsDir>/skills`.
   */
  source?: SkillSource,
): string {
  // Blueprints are named by type+name (checked BEFORE an explicit name, because a
  // blueprint `name` is the short component name, not a namespace)
  if (frontmatter?.type && typeof frontmatter.type === 'string') {
    // If name contains ':', it's an explicit namespaced name — use it directly
    if (frontmatter.name && typeof frontmatter.name === 'string' && frontmatter.name.includes(':')) {
      return frontmatter.name;
    }
    const bpName = frontmatter.name ?? filePath.replace(/\\/g, '/').split('/').pop()?.replace(/\.md$/, '') ?? '';
    const skill = source
      ? source.name
      : (relative(resolve(agentsDir, 'skills'), filePath).replace(/\\/g, '/').split('/')[0] ?? '');
    return `${skill}:blueprints:${frontmatter.type}/${bpName}`;
  }

  // Use explicit name if set in frontmatter (non-blueprint)
  if (frontmatter?.name && typeof frontmatter.name === 'string') {
    return frontmatter.name;
  }

  // Plugin-source file: derive namespace from source name + rel-within-root path.
  if (source) {
    return derivePluginArtifactName(source, filePath);
  }

  // Derive from filesystem path: skills/<skill>[/…]/<kind>/<artifact>.md
  const rel = relative(resolve(agentsDir, 'skills'), filePath).replace(/\\/g, '/');
  const parts = rel.split('/');
  const skill = parts[0] ?? '';
  const artifact = (parts[parts.length - 1] ?? '').replace(/\.md$/, '');

  // Concern = the directory directly containing the kind dir (tasks/rules/
  // blueprints/workflows) — the segment two levels above the artifact file.
  // Covers both the flat concern layout (skills/<skill>/<concern>/<kind>/x) and
  // the nested sub-skill layout (skills/<skill>/skills/<wf>/<kind>/x → concern <wf>).
  // Flat (skills/<skill>/<kind>/x → 3 parts) has no concern.
  if (parts.length >= 4) {
    const concern = parts[parts.length - 3]!;
    return `${skill}:${concern}:${artifact}`;
  }

  // Flat: skill/kind/artifact.md
  return `${skill}:${artifact}`;
}

/**
 * Resolve short name to full namespaced name within the same skill context.
 * E.g., `design:screenshot-reference` in skill `designbook` → `designbook:design:screenshot-reference`
 */
function resolveShortName(shortName: string, skillName: string): string {
  const segments = shortName.split(':');
  if (segments.length >= 3) return shortName; // Already fully qualified
  return `${skillName}:${shortName}`;
}

// ── Trigger/Filter Condition Matching ──────────────────────────────

/**
 * Look up a key in context first, then config. Config supports dot-path traversal
 * as fallback (e.g. `frameworks.css` walks into `config.frameworks.css`).
 */
function lookup(key: string, context: Record<string, unknown>, config: Record<string, unknown>): unknown {
  if (context[key] !== undefined) return context[key];
  if (config[key] !== undefined) return config[key];
  // Dot-path traversal into config (forward-compat for non-flattened configs)
  return key
    .split('.')
    .reduce(
      (obj, part) => (obj != null && typeof obj === 'object' ? (obj as Record<string, unknown>)[part] : undefined),
      config as unknown,
    );
}

/**
 * Check whether a rule's domain matches any of the effective domains.
 *
 * Matching rules (dot-delimited prefix matching):
 * - Exact: "components" matches "components"
 * - Rule is child of need: need "components" matches rule "components.layout"
 * - Rule is parent of need: need "components.layout" matches rule "components"
 * - No partial segment: "components" does NOT match "components-extra"
 */
function matchDomain(ruleDomain: string, effectiveDomains: string[]): boolean {
  for (const need of effectiveDomains) {
    if (ruleDomain === need) return true;
    if (ruleDomain.startsWith(need + '.')) return true;
    if (need.startsWith(ruleDomain + '.')) return true;
  }
  return false;
}

type MatchOutcome = 'match' | 'nomatch' | 'defer';

function matchConditionKey(
  key: string,
  value: unknown,
  context: Record<string, unknown>,
  config: Record<string, unknown>,
): MatchOutcome {
  if (key === 'domain') {
    const domains = context['domain'];
    if (domains === undefined) return 'defer';
    const effectiveDomains: string[] = Array.isArray(domains) ? domains.map(String) : [String(domains)];
    const ruleDomains: string[] = Array.isArray(value) ? (value as string[]).map(String) : [String(value)];
    return ruleDomains.some((rd) => matchDomain(rd, effectiveDomains)) ? 'match' : 'nomatch';
  }

  const actual = lookup(key, context, config);
  if (actual === undefined) return 'defer';
  if (Array.isArray(value)) {
    return value.map(String).includes(String(actual ?? '')) ? 'match' : 'nomatch';
  }
  if (Array.isArray(actual)) {
    return actual.map(String).includes(String(value)) ? 'match' : 'nomatch';
  }
  return String(actual ?? '') === String(value) ? 'match' : 'nomatch';
}

/**
 * Check whether a `trigger:` + `filter:` pair matches against context + config.
 *
 * - `trigger:` keys (`steps`, `domain`) declare WHEN the rule/blueprint becomes active.
 *   They are OR-connected and STRICT: at least one trigger must explicitly match.
 *   A trigger key whose context value is undefined does NOT pass — strict semantics
 *   ensure that e.g. `trigger.domain: components` never matches a task that did not
 *   declare a domain.
 * - `filter:` keys (`backend`, `frameworks.*`, `extensions`, `type`, …) declare
 *   WHERE (project config) the rule/blueprint is applicable. They are AND-connected
 *   and deferring: an undefined config/context value is treated as a pass.
 *
 * Lookup order per key: context first, config fallback (with dot-path traversal).
 *
 * Returns specificity count (number of declared keys) on success, or `false` on mismatch.
 */
function checkConditions(
  trigger: Record<string, unknown> | undefined,
  filter: Record<string, unknown> | undefined,
  context: Record<string, unknown>,
  config: Record<string, unknown>,
): number | false {
  if (filter) {
    for (const [key, value] of Object.entries(filter)) {
      const outcome = matchConditionKey(key, value, context, config);
      if (outcome === 'nomatch') return false;
    }
  }

  if (trigger && Object.keys(trigger).length > 0) {
    let anyMatch = false;
    for (const [key, value] of Object.entries(trigger)) {
      const outcome = matchConditionKey(key, value, context, config);
      if (outcome === 'match') {
        anyMatch = true;
        break;
      }
    }
    if (!anyMatch) return false;
  }

  const triggerCount = trigger ? Object.keys(trigger).length : 0;
  const filterCount = filter ? Object.keys(filter).length : 0;
  return triggerCount + filterCount;
}

/** Build the step-specific context trigger/filter conditions are evaluated against. */
export function buildRuntimeContext(step?: string, extraConditions?: Record<string, string>): Record<string, unknown> {
  const context: Record<string, unknown> = {};
  if (step !== undefined) context['steps'] = step;
  if (extraConditions) Object.assign(context, extraConditions);
  return context;
}

/**
 * Enrich config with derived DESIGNBOOK_* env vars and normalized extensions array.
 */
function buildEnrichedConfig(config: DesignbookConfig): Record<string, unknown> {
  const enriched: Record<string, unknown> = { ...(config as Record<string, unknown>) };
  Object.assign(enriched, buildEnvMap(config));
  const extensions = normalizeExtensions(config['extensions']);
  enriched['extensions'] = getExtensionIds(extensions).split(',').filter(Boolean);
  return enriched;
}

// ── Environment Variable Map ───────────────────────────────────────

/**
 * Build a map of DESIGNBOOK_* env vars from config for template expansion.
 *
 * Emits:
 * - DESIGNBOOK_WORKSPACE from `workspace`
 * - DESIGNBOOK_HOME / DESIGNBOOK_DATA / DESIGNBOOK_URL / DESIGNBOOK_CMD from `designbook.*` keys
 * - DESIGNBOOK_DIRS_* from `dirs.*` keys
 * - All other scalar config values → DESIGNBOOK_<KEY>
 */
export function buildEnvMap(config: DesignbookConfig): Record<string, string> {
  const env: Record<string, string> = {};

  // Dynamic: all scalar config values → DESIGNBOOK_<KEY>
  // Dot-path keys are split and rejoined with '_'. The 'frameworks' segment is
  // renamed to 'FRAMEWORK' (singular) to match the shell `config` output
  // (e.g. frameworks.css → DESIGNBOOK_FRAMEWORK_CSS).
  // Skip internal properties and designbook.* keys (handled explicitly below)
  for (const [key, value] of Object.entries(config)) {
    if (value == null || typeof value === 'object') continue;
    if (key === 'data' || key === 'workspace') continue;
    if (key.startsWith('designbook.')) continue;
    const parts = key.split('.');
    const envParts = parts.map((p) => (p === 'frameworks' ? 'FRAMEWORK' : p.toUpperCase()));
    env[`DESIGNBOOK_${envParts.join('_')}`] = String(value);
  }

  // Explicit: DESIGNBOOK_WORKSPACE, DESIGNBOOK_HOME, DESIGNBOOK_DATA, DESIGNBOOK_URL, DESIGNBOOK_CMD
  if (config.workspace) env['DESIGNBOOK_WORKSPACE'] = String(config.workspace);
  if (config['designbook.home']) env['DESIGNBOOK_HOME'] = String(config['designbook.home']);
  if (config['designbook.data']) env['DESIGNBOOK_DATA'] = String(config['designbook.data']);
  if (config['designbook.url']) env['DESIGNBOOK_URL'] = String(config['designbook.url']);
  if (config['designbook.cmd']) env['DESIGNBOOK_CMD'] = String(config['designbook.cmd']);

  // Derived: extensions as comma-sep IDs + skill IDs
  const extensions = normalizeExtensions(config['extensions']);
  env['DESIGNBOOK_EXTENSIONS'] = getExtensionIds(extensions);
  env['DESIGNBOOK_EXTENSION_SKILLS'] = getExtensionSkillIds(extensions);

  return env;
}

// ── Unified File Resolution ─────────────────────────────────────────

/**
 * Find markdown files matching a glob pattern and filter by `trigger:` +
 * `filter:` frontmatter conditions against context (runtime) and config (project).
 *
 * Returns all matches with their specificity (number of declared keys matched).
 *
 * When `requireWhen` is true (default), files without any conditions are
 * skipped — at least one declared key across `trigger:` or `filter:` is required.
 * Set to false for task files where unconditional matching is expected.
 */
export function resolveFiles(
  globPattern: string,
  context: Record<string, unknown>,
  config: Record<string, unknown>,
  agentsDir: string,
  requireWhen = true,
  sources?: SkillSource[],
): ResolvedFile[] {
  const results: ResolvedFile[] = [];

  // Each candidate carries its source (undefined = project layout under agentsDir).
  const candidates: Array<{ filePath: string; source?: SkillSource }> = [];
  for (const filePath of globSync(globPattern, { cwd: agentsDir, absolute: true })) {
    candidates.push({ filePath });
  }
  const sourcePattern = toSourcePattern(globPattern);
  for (const source of pluginSources(sources)) {
    for (const filePath of globSync(sourcePattern, { cwd: source.root, absolute: true })) {
      candidates.push({ filePath, source });
    }
  }

  const seen = new Set<string>();
  for (const candidate of candidates) {
    // Slash-command aliases point into the same skill tree. Resolve once before
    // deriving names or relative schema references from the discovered path.
    const filePath = realpathSync(candidate.filePath);
    if (seen.has(filePath)) continue;
    seen.add(filePath);
    const source = candidate.source && { ...candidate.source, root: realpathSync(candidate.source.root) };
    const namingRoot = source ? agentsDir : dirname(realpathSync(resolve(agentsDir, 'skills')));
    const frontmatter = parseFrontmatter(filePath);
    const trigger = frontmatter?.trigger as Record<string, unknown> | undefined;
    const filter = frontmatter?.filter as Record<string, unknown> | undefined;
    const name = deriveArtifactName(filePath, namingRoot, frontmatter, source);

    const triggerCount = trigger ? Object.keys(trigger).length : 0;
    const filterCount = filter ? Object.keys(filter).length : 0;
    if (triggerCount + filterCount === 0) {
      if (requireWhen) {
        continue;
      }
      results.push({ path: filePath, name, specificity: 0, frontmatter });
      continue;
    }

    const specificity = checkConditions(trigger, filter, context, config);
    if (specificity !== false) {
      results.push({ path: filePath, name, specificity, frontmatter });
    }
  }

  return results;
}

// ── Root Precedence ──────────────────────────────────────────────────

/** Path lives under a plugin-cache skills root (installed plugin / user copy). */
function isPluginRootPath(p: string): boolean {
  return /\/(?:\.cli-skills-root[^/]*|plugins\/cache)\//.test(p.replace(/\\/g, '/'));
}

/**
 * Apply project-over-user (plugin) root precedence: first hit wins by root.
 *
 * Search order is project first, then user. If the project root yields ANY
 * match, the user/plugin matches are discarded wholesale — never merged. The
 * installed plugin is only a fallback for steps the project does not define.
 */
function preferProjectRoot(files: ResolvedFile[]): ResolvedFile[] {
  const projectMatches = files.filter((f) => !isPluginRootPath(f.path));
  return projectMatches.length > 0 ? projectMatches : files;
}

// ── Name/As Deduplication & Priority Sorting ─────────────────────────

/**
 * Apply name/as deduplication and priority sorting to resolved files.
 *
 * 1. Collect all files
 * 2. Group by effective name (own `name` for standalone, `as` target for overrides)
 * 3. Within each group, highest `priority` wins (tiebreak: alphabetical skill name, last wins)
 * 4. Return remaining files sorted by priority (lowest first)
 *
 * Emits warnings for `as` targets that don't exist in the resolved set.
 */
function deduplicateByNameAs(files: ResolvedFile[], agentsDir: string, warnings: string[] = []): ResolvedFile[] {
  // Separate files into standalone (no `as`) and overrides (with `as`)
  const standalone: ResolvedFile[] = [];
  const overrides: Array<{ file: ResolvedFile; asTarget: string; priority: number }> = [];

  for (const file of files) {
    const asValue = file.frontmatter?.as as string | undefined;
    if (asValue) {
      // Resolve short name: derive skill from file path
      const skillsDir = resolve(agentsDir, 'skills');
      const rel = relative(existsSync(skillsDir) ? realpathSync(skillsDir) : skillsDir, file.path).replace(/\\/g, '/');
      const skill = rel.split('/')[0] ?? '';
      const resolvedAs = resolveShortName(asValue, skill);
      const priority = typeof file.frontmatter?.priority === 'number' ? (file.frontmatter.priority as number) : 0;
      overrides.push({ file, asTarget: resolvedAs, priority });
    } else {
      standalone.push(file);
    }
  }

  // Build a map of standalone files by name for override lookup
  const standaloneByName = new Map<string, ResolvedFile>();
  for (const file of standalone) {
    standaloneByName.set(file.name, file);
  }

  // Apply overrides: group by asTarget, highest priority wins
  const overridesByTarget = new Map<string, Array<{ file: ResolvedFile; priority: number }>>();
  for (const o of overrides) {
    if (!overridesByTarget.has(o.asTarget)) {
      overridesByTarget.set(o.asTarget, []);
    }
    overridesByTarget.get(o.asTarget)!.push({ file: o.file, priority: o.priority });
  }

  for (const [target, candidates] of overridesByTarget) {
    const original = standaloneByName.get(target);
    if (!original) {
      // as target doesn't exist — warn and run as additive
      warnings.push(`as target '${target}' not found — task runs as additive`);
      for (const c of candidates) {
        standalone.push(c.file);
      }
      continue;
    }

    // Compare original priority with override candidates
    const originalPriority =
      typeof original.frontmatter?.priority === 'number' ? (original.frontmatter.priority as number) : 0;

    // Find highest priority override
    candidates.sort((a, b) => b.priority - a.priority);
    const winner = candidates[0]!;

    if (winner.priority > originalPriority) {
      // Override wins — remove original, add winner
      standaloneByName.delete(target);
      standalone.splice(standalone.indexOf(original), 1);
      standalone.push(winner.file);
    } else if (winner.priority === originalPriority) {
      // Equal priority — alphabetical tiebreak (last wins)
      const originalSkill = original.name.split(':')[0] ?? '';
      const winnerSkill = winner.file.name.split(':')[0] ?? '';
      if (winnerSkill >= originalSkill) {
        standaloneByName.delete(target);
        standalone.splice(standalone.indexOf(original), 1);
        standalone.push(winner.file);
      }
      // else original wins
    }
    // else original priority is higher — original stays
  }

  // Sort by priority (lowest first)
  standalone.sort((a, b) => {
    const pa = typeof a.frontmatter?.priority === 'number' ? (a.frontmatter.priority as number) : 0;
    const pb = typeof b.frontmatter?.priority === 'number' ? (b.frontmatter.priority as number) : 0;
    return pa - pb;
  });

  return standalone;
}

// ── Task File Resolution ────────────────────────────────────────────

/**
 * Try to resolve an explicit `skill:task` path against plugin SkillSource roots.
 * Checks the flat `<source.root>/tasks/<name>.md` first, then `**\/tasks/<name>.md`.
 */
function resolveExplicitTaskInPluginSources(
  skillName: string,
  taskName: string,
  sources?: SkillSource[],
): string | undefined {
  const source = pluginSources(sources).find((s) => s.name === skillName);
  if (!source) return undefined;
  const flat = resolve(source.root, 'tasks', `${taskName}.md`);
  if (existsSync(flat)) return flat;
  const nested = globSync(`**/tasks/${taskName}.md`, { cwd: source.root, absolute: true });
  if (nested.length > 0) return nested[0]!;
  return undefined;
}

/**
 * Resolve a step name to its task files, with name/as deduplication and priority sorting.
 *
 * Named steps (`skill:task`) always return at most one file; generic steps return
 * every contributing skill's task file.
 */
export function resolveTaskFilesRich(
  step: string,
  config: DesignbookConfig,
  agentsDir: string,
  sources?: SkillSource[],
): ResolvedFile[] {
  const context = buildRuntimeContext(step);
  const enrichedConfig = buildEnrichedConfig(config);

  // Primary: broad scan — find all tasks with trigger.steps matching this step
  const broadMatches = resolveFiles('skills/**/tasks/*.md', context, enrichedConfig, agentsDir, true, sources);

  // Named step (skill:task format): return single best match, no dedup needed
  if (step.includes(':')) {
    if (broadMatches.length > 0) {
      broadMatches.sort((a, b) => b.specificity - a.specificity);
      return [broadMatches[0]!];
    }
    // Fallback: direct skill-dir resolution
    const parts = step.split(':', 2);
    const skillName = parts[0] ?? '';
    const taskName = parts[1] ?? '';
    const taskPath = resolve(agentsDir, 'skills', skillName, 'tasks', `${taskName}.md`);
    if (existsSync(taskPath)) {
      const canonicalPath = realpathSync(taskPath);
      console.warn(
        `[designbook] task "${taskPath}" resolved by filename — add trigger.steps: [${step}] to frontmatter`,
      );
      const frontmatter = parseFrontmatter(canonicalPath);
      const namingRoot = dirname(realpathSync(resolve(agentsDir, 'skills')));
      const name = deriveArtifactName(canonicalPath, namingRoot, frontmatter);
      return [{ path: canonicalPath, name, specificity: 0, frontmatter }];
    }
    const pluginTaskPath = resolveExplicitTaskInPluginSources(skillName, taskName, sources);
    if (pluginTaskPath) {
      console.warn(
        `[designbook] task "${pluginTaskPath}" resolved by filename — add trigger.steps: [${step}] to frontmatter`,
      );
      const frontmatter = parseFrontmatter(pluginTaskPath);
      const pluginSource = pluginSources(sources).find((s) => s.name === skillName);
      const name = deriveArtifactName(pluginTaskPath, agentsDir, frontmatter, pluginSource);
      return [{ path: pluginTaskPath, name, specificity: 0, frontmatter }];
    }
    return [];
  }

  // Generic step: return ALL broad-scan matches, deduplicated. Collapse
  // same-logical-file copies across roots (project + plugin cache) first.
  if (broadMatches.length > 0) {
    return deduplicateByNameAs(preferProjectRoot(broadMatches), agentsDir);
  }

  // Fallback: filename-based resolution with deprecation warning
  const filenameMatches = resolveFiles(
    `skills/**/tasks/${step}.md`,
    context,
    enrichedConfig,
    agentsDir,
    false,
    sources,
  );
  if (filenameMatches.length > 0) {
    for (const m of filenameMatches) {
      console.warn(`[designbook] task "${m.path}" resolved by filename — add trigger.steps: [${step}] to frontmatter`);
    }
    return deduplicateByNameAs(preferProjectRoot(filenameMatches), agentsDir);
  }

  return [];
}

// ── Rule and Blueprint Matching ─────────────────────────────────────

/**
 * Scan all rule files and return paths matching the given step and config.
 *
 * Domain matching is handled via `trigger.domain` in each rule file; the
 * `effectiveDomains` are injected into the runtime context as `context.domain`.
 */
export function matchRuleFiles(
  step: string,
  config: DesignbookConfig,
  agentsDir: string,
  extraConditions?: Record<string, string>,
  effectiveDomains?: string[],
  sources?: SkillSource[],
): string[] {
  const context = buildRuntimeContext(step, extraConditions);
  if (effectiveDomains && effectiveDomains.length > 0) {
    context['domain'] = effectiveDomains;
  }
  const enrichedConfig = buildEnrichedConfig(config);
  const matches = resolveFiles('skills/**/rules/*.md', context, enrichedConfig, agentsDir, true, sources);
  return matches.map((m) => m.path);
}

/**
 * Scan all blueprint files and return paths matching the given step and config.
 *
 * Unlike rules (which are additive), blueprints are unique per `type`+`name`.
 * If multiple skills define the same type+name blueprint, the one with the
 * highest `priority` frontmatter field wins (default: 0). Equal priority
 * uses last-match-wins (skills are globbed alphabetically).
 */
export function matchBlueprintFiles(
  step: string,
  config: DesignbookConfig,
  agentsDir: string,
  extraConditions?: Record<string, string>,
  effectiveDomains?: string[],
  sources?: SkillSource[],
): string[] {
  const context = buildRuntimeContext(step, extraConditions);
  if (effectiveDomains && effectiveDomains.length > 0) {
    context['domain'] = effectiveDomains;
  }
  const enrichedConfig = buildEnrichedConfig(config);
  const matches = resolveFiles('skills/**/blueprints/*.md', context, enrichedConfig, agentsDir, true, sources);

  // Deduplicate by type+name — highest priority wins, equal priority = last match wins
  const byKey = new Map<string, { path: string; priority: number }>();
  for (const m of matches) {
    const type = m.frontmatter?.['type'] as string | undefined;
    const name = m.frontmatter?.['name'] as string | undefined;
    if (type && name) {
      const key = `${type}:${name}`;
      const priority = typeof m.frontmatter?.['priority'] === 'number' ? (m.frontmatter['priority'] as number) : 0;
      const existing = byKey.get(key);
      if (!existing || priority >= existing.priority) {
        byKey.set(key, { path: m.path, priority });
      }
    }
  }
  return Array.from(byKey.values()).map((v) => v.path);
}

// ── Config Resolution ───────────────────────────────────────────────

/**
 * Resolve workflow config rules and instructions for a step.
 * Extension skills (from extensions[].skill in config) are injected into
 * config_instructions at lower priority than explicit step instructions.
 */
export function resolveConfigForStep(
  step: string,
  rawConfig: Record<string, unknown>,
): { config_rules: string[]; config_instructions: string[] } {
  const workflow = rawConfig.workflow as Record<string, unknown> | undefined;

  const rules = workflow?.rules as Record<string, unknown> | undefined;
  const tasks = workflow?.tasks as Record<string, unknown> | undefined;

  const configRules = rules?.[step];
  const configInstructions = tasks?.[step];

  const explicitInstructions = Array.isArray(configInstructions) ? configInstructions.map(String) : [];

  const extensionSkills = getExtensionSkillIds(normalizeExtensions(rawConfig['extensions'])).split(',').filter(Boolean);

  return {
    config_rules: Array.isArray(configRules) ? configRules.map(String) : [],
    config_instructions: [...explicitInstructions, ...extensionSkills],
  };
}
