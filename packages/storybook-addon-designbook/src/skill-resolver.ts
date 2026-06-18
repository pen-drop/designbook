/**
 * Runtime-agnostic skill resolution for Designbook.
 *
 * Where a skill's content (workflows/tasks/rules/blueprints/schemas) lives
 * depends on the agent runtime that invoked the CLI:
 *
 * - Claude Code: `~/.claude/plugins/cache/<marketplace>/<skill>/<hash>/` (hashed),
 *   and each plugin's `bin/` is injected onto `PATH` with the live hash.
 * - Codex:       `$CODEX_HOME/skills/` (default `~/.codex/skills/`) — flat.
 * - Gemini CLI:  `~/.gemini/skills/` — flat.
 * - cross-runtime (Codex/Gemini/Copilot): `~/.agents/skills/` — flat.
 *
 * A {@link SkillResolver} is a self-contained plugin that detects its runtime,
 * locates the base directory, and expands it into {@link SkillSource}s via the
 * layout-aware {@link deriveSkillSourcesFromBase}. The built-in resolvers run in
 * a fixed order and the FIRST whose `apply` returns a non-empty list wins — so
 * an empty return is the universal "not me / nothing here, try the next one"
 * signal. There is intentionally no external registration: to support a new
 * runtime, add a resolver to {@link BUILT_IN_RESOLVERS}.
 *
 * `skill-resolver` imports `skill-sources` one-way (no import cycle):
 * `skill-sources` owns the layout primitives, this module owns runtime policy.
 */

import { homedir } from 'node:os';
import { delimiter, dirname, join } from 'node:path';
import { type DesignbookConfig, loadConfig } from './config.js';
import { deriveSkillSourcesFromBase, resolveProjectSkillSources, type SkillSource } from './skill-sources.js';

/** Inputs a resolver reads. `env`/`home` are injectable so resolvers are testable. */
export interface ResolveContext {
  env: NodeJS.ProcessEnv;
  home: string;
  config: DesignbookConfig;
}

/** A runtime skill resolver. `apply` returns finished sources, or `[]` to fall through. */
export interface SkillResolver {
  name: string;
  apply(ctx: ResolveContext): SkillSource[];
}

/**
 * Scan `PATH` for a Claude-Code plugin bin entry and derive the marketplace base.
 *
 * Matches `…/plugins/cache/<marketplace>/designbook(-*)?/<hash>/bin` and returns
 * the marketplace dir (`…/plugins/cache/<marketplace>`) — the parent of the
 * skill-name dir, which {@link deriveSkillSourcesFromBase} scans for siblings.
 * Uses the live, runtime-injected hash, so no home path is hardcoded.
 */
function pathScanBase(env: NodeJS.ProcessEnv): string | null {
  const raw = env['PATH'] ?? '';
  for (const entry of raw.split(delimiter)) {
    if (!entry) continue;
    const cleaned = entry.replace(/[\\/]+$/, '');
    if (!/[\\/]plugins[\\/]cache[\\/][^\\/]+[\\/]designbook(?:-[^\\/]+)?[\\/][^\\/]+[\\/]bin$/.test(cleaned)) {
      continue;
    }
    const contentRoot = dirname(cleaned); // strip `/bin` → …/<skill>/<hash>
    const skillDir = dirname(contentRoot); // …/<marketplace>/<skill>
    return dirname(skillDir); // …/<marketplace>
  }
  return null;
}

/** Expand the first of `bases` that yields any sources; `[]` if none do. */
function firstNonEmpty(bases: Array<string | null | undefined>): SkillSource[] {
  for (const base of bases) {
    if (!base) continue;
    const sources = deriveSkillSourcesFromBase(base);
    if (sources.length > 0) return sources;
  }
  return [];
}

const configResolver: SkillResolver = {
  name: 'config',
  apply: (ctx) =>
    typeof ctx.config.skills === 'string' && ctx.config.skills ? firstNonEmpty([ctx.config.skills]) : [],
};

const claudeCodeResolver: SkillResolver = {
  name: 'claude-code',
  apply: (ctx) => {
    const isClaudeCode = ctx.env['CLAUDECODE'] === '1' || /claude-code/.test(ctx.env['AI_AGENT'] ?? '');
    if (!isClaudeCode) return [];
    return firstNonEmpty([pathScanBase(ctx.env), join(ctx.home, '.claude', 'plugins', 'cache', 'designbook')]);
  },
};

const codexResolver: SkillResolver = {
  name: 'codex',
  apply: (ctx) => {
    const codexHome = ctx.env['CODEX_HOME'] ? ctx.env['CODEX_HOME'] : join(ctx.home, '.codex');
    return firstNonEmpty([join(codexHome, 'skills')]);
  },
};

const geminiResolver: SkillResolver = {
  name: 'gemini',
  apply: (ctx) => firstNonEmpty([join(ctx.home, '.gemini', 'skills')]),
};

const agentsResolver: SkillResolver = {
  name: 'agents',
  apply: (ctx) => firstNonEmpty([join(ctx.home, '.agents', 'skills')]),
};

/**
 * Built-in resolvers, in precedence order. The first whose `apply` returns a
 * non-empty list wins. `config` (explicit override) is first; runtime detectors
 * follow; `agents` is the cross-runtime fallback.
 */
export const BUILT_IN_RESOLVERS: SkillResolver[] = [
  configResolver,
  claudeCodeResolver,
  codexResolver,
  geminiResolver,
  agentsResolver,
];

/**
 * Resolve plugin-layout skill sources for the given context. Returns the winning
 * resolver's name and its sources, or `null` when no resolver produced any
 * (e.g. a dev repo where project-local sources cover everything).
 */
export function resolvePluginSkillSources(ctx: ResolveContext): { runtime: string; sources: SkillSource[] } | null {
  // `DESIGNBOOK_DISABLE_AUTODETECT=1` turns off the runtime detectors (keeping the
  // explicit `config` override) — used by the test sandbox for hermeticity, and
  // available to consumers that want project-local skills only.
  const runtimeDisabled = ctx.env['DESIGNBOOK_DISABLE_AUTODETECT'] === '1';
  for (const resolver of BUILT_IN_RESOLVERS) {
    if (runtimeDisabled && resolver.name !== 'config') continue;
    const sources = resolver.apply(ctx);
    if (sources.length > 0) return { runtime: resolver.name, sources };
  }
  return null;
}

/**
 * Build the full ordered skill source list for a config dir: project-local
 * sources (highest precedence) merged with the winning runtime resolver's
 * sources. `overrides` injects `env`/`home` for testing (default: process env).
 */
export function resolveSkillSources(
  configDir: string,
  overrides?: { env?: NodeJS.ProcessEnv; home?: string },
): SkillSource[] {
  const ctx: ResolveContext = {
    env: overrides?.env ?? process.env,
    home: overrides?.home ?? homedir(),
    config: loadConfig(configDir),
  };

  const projectSources = resolveProjectSkillSources(configDir);
  const pluginResult = resolvePluginSkillSources(ctx);

  if (pluginResult && process.env['DESIGNBOOK_DEBUG']) {
    const base = pluginResult.sources[0]?.root ?? '?';
    process.stderr.write(`[designbook] skills: ${pluginResult.runtime} → ${base}\n`);
  }

  const byName = new Map<string, SkillSource>();
  for (const src of projectSources) byName.set(src.name, src);
  for (const src of pluginResult?.sources ?? []) {
    if (!byName.has(src.name)) byName.set(src.name, src);
  }
  return Array.from(byName.values());
}
