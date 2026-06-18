# Runtime-Agnostic Skill Resolver — Design

**Date:** 2026-06-18
**Status:** Implemented
**Stacks on:** PR #106 (`refactor/skills-discovery-config`) → #105 (`fix/plugin-skills-discovery`)

## Problem

The `_debo` CLI must locate a skill's `workflows/tasks/rules/blueprints/schemas`
content. In a dev repo they sit under `<project>/.agents/skills/`. When
Designbook is installed as a plugin, the content lives in a runtime-specific
cache that differs per agent runtime:

| Runtime | Skill content path | Layout |
|---|---|---|
| Claude Code | `~/.claude/plugins/cache/<marketplace>/<skill>/<hash>/` | hashed |
| Codex | `$CODEX_HOME/skills/` (default `~/.codex/skills/`) | flat |
| Gemini CLI | `~/.gemini/skills/` | flat |
| cross-runtime (Codex/Gemini/Copilot) | `~/.agents/skills/` | flat |

Prior states were Claude-Code-specific:
- The `DESIGNBOOK_SKILLS` env contract (#105) required the agent to inject
  Claude Code's hashed base directory every session.
- The config `skills` key (#106) removed the per-session burden but still
  expects a human to name a Claude-Code-shaped path (`~/.claude/plugins/cache/...`).

Neither resolves where the skills live **based on the runtime that is actually
running**. We want a resolver that detects the runtime (via env signals) where
it can, probes known locations where it cannot, and falls back to an explicit
config override — with no Claude-Code assumption baked in.

## Key findings (grounded from the live environment + superpowers refs)

1. Runtime-identifying env vars **do** exist: Claude Code sets `CLAUDECODE=1`
   (and `AI_AGENT=claude-code_…`); Codex sets `CODEX_HOME`. Gemini exposes no
   reliable documented env signal.
2. Claude Code injects each plugin's `bin/` onto `PATH` **with the current
   hash**, e.g. `…/plugins/cache/designbook/designbook/<hash>/bin`. The current
   skill content root is therefore discoverable by scanning `PATH` — no
   hardcoded home path, always the live hash.
3. Codex, Gemini, and Copilot all read a shared cross-runtime directory
   `~/.agents/skills/` (flat layout). This is the universal anchor for the
   non-Claude runtimes.
4. `deriveSkillSourcesFromBase` (from #106) already handles **both** the hashed
   marketplace layout and the flat layout. The only missing piece is choosing
   the correct **base directory** per runtime.

This splits the problem cleanly: *where* the skills live (runtime concern) vs
*which* skills + *what* layout (already solved).

## Architecture

A resolver registry (internal, no external registration) sits on top of the
layout primitives. Two modules, one-way import (`skill-resolver` → `skill-sources`),
so no import cycle.

### `skill-sources.ts` (existing) — layout/fs primitives

Owns only "which skills + what layout", no runtime knowledge:
`SkillSource`, `isSkillContentRoot`, `deriveSkillSourcesFromBase` (hashed +
flat layouts, newest-mtime tiebreak — unchanged from #106), and
`resolveProjectSkillSources(configDir)`.

### `skill-resolver.ts` (new) — runtime resolution

A resolver is a self-contained plugin that does everything — detect + locate +
expand — and returns finished `SkillSource[]`:

```ts
interface ResolveContext {
  env: NodeJS.ProcessEnv;     // injectable for tests (default process.env)
  home: string;               // injectable for tests (default os.homedir())
  config: DesignbookConfig;
}
interface SkillResolver {
  name: string;               // 'config' | 'claude-code' | 'codex' | 'gemini' | 'agents'
  apply(ctx: ResolveContext): SkillSource[];   // [] = not applicable / no content
}
```

The registry is a fixed ordered array of built-in resolvers (no public
register API, no config-driven module loading — only the known runtimes are
supported). **First `apply` that returns a non-empty array wins:**

```ts
function resolvePluginSkillSources(ctx: ResolveContext): { runtime: string; sources: SkillSource[] } | null {
  for (const r of BUILT_IN_RESOLVERS) {
    const sources = r.apply(ctx);
    if (sources.length) return { runtime: r.name, sources };
  }
  return null;
}
```

`apply` returning `[]` is the fallthrough signal — it unifies "wrong runtime",
"path missing", and "stale config" into one branch. Each resolver expands via
the shared `deriveSkillSourcesFromBase`, so all sibling skills come from the
**same** winning resolver — never mixed across runtimes.

`resolveSkillSources(configDir)` (moved here; the orchestrator):

1. `projectSources` = `resolveProjectSkillSources(configDir)` (origin `project`).
2. `pluginResult = resolvePluginSkillSources({ env, home, config: loadConfig(configDir) })`.
3. Merge: project sources override plugin sources of the same name.

### Built-in resolvers (fixed order)

| # | name | `apply` returns sources from … |
|---|---|---|
| 1 | `config` | `config.skills` (if set) — explicit override, **fallthrough if empty** |
| 2 | `claude-code` | only if `CLAUDECODE=1` / `AI_AGENT~claude-code`: first non-empty of `[PATH-scan-base, ~/.claude/plugins/cache/designbook]` |
| 3 | `codex` | `$CODEX_HOME/skills` (default `~/.codex/skills`) |
| 4 | `gemini` | `~/.gemini/skills` |
| 5 | `agents` | `~/.agents/skills` (cross-runtime: Codex/Gemini/Copilot) |

- **PATH-scan** (claude-code primary): split `env.PATH` by `path.delimiter`,
  find an entry matching `…/plugins/cache/<mp>/designbook(-*)?/<hash>/bin`,
  marketplace base = `dirname(dirname(entry))` (parent of the skill dir). Uses
  the live, runtime-injected hash; no home/hardcode dependency.
- `config`/`codex`/`gemini`/`agents` resolve their dir then expand via
  `deriveSkillSourcesFromBase`, returning `[]` when the dir is absent or holds
  no `designbook` source — which makes the next resolver run.

Project-local skills are layered on top by `resolveSkillSources` and always win
by name (local dev override).

## Runtime wiring

- CLI entrypoints (`cli/plan.ts`, `cli/workflow.ts`) call
  `resolveSkillSources(configDir)` — same signature, now imported from
  `skill-resolver.ts`.
- `workflow.ts` runtime schema-resolution (currently reads `config.skills`
  directly) calls `resolvePluginSkillSources({ env: process.env, home, config:
  options.config })`, so it gets the full resolver, not just the config key.

## Cross-cutting details

- PATH split via `path.delimiter` (Windows-safe).
- One stderr debug line on resolution: `[designbook] skills: <runtime> → <base>`
  (helps diagnose "Workflow file not found").
- `config.skills` retained as the priority-1 override (escape hatch for unknown
  runtimes / pinned dev setups); `~`/relative paths resolve against the config dir.

## Testing

`resolvePluginSkillSources`/`resolveSkillSources` take injected `env` + `home`,
pointed at a fixture tree, so each resolver branch is deterministic:

- Claude Code via PATH-scan (fixture PATH entry with hash) → hashed base.
- Claude Code PATH absent → `~/.claude/plugins/cache/designbook` fallback.
- Codex via `CODEX_HOME` → `$CODEX_HOME/skills` (flat).
- Gemini → `~/.gemini/skills` (no env signal, dir-based).
- `.agents/skills` shared fallback.
- `config.skills` resolver wins over runtime resolvers.
- Stale `config.skills` (no content) → falls through to the next resolver.
- Project-local override beats plugin sources of the same name.
- No content anywhere → `null`.

Existing #106 tests (layout expansion, newest-mtime, sibling derivation,
relative `$ref` re-anchor) stay green unchanged.

## Out of scope (YAGNI)

- **External resolver registration** — no public `register` API and no
  config-driven module loading. Only the built-in resolvers ship. If a future
  runtime needs support, add a built-in resolver to the array.
- Per-runtime tool/command differences (handled by superpowers platform refs).
- Caching the resolution across CLI invocations (each call is cheap: a few
  `existsSync` checks).
- Auto-writing `config.skills` during `install` (the resolver makes it optional).

## Decisions

- **Approach:** A+B hybrid via a fixed internal resolver array; first non-empty
  `apply` wins. Resolver logic kept for clarity/testability, but **not**
  externally extensible.
- **Runtimes:** Claude Code, Codex, Gemini explicitly; `~/.agents/skills` covers
  Copilot and future cross-runtime CLIs for free.
- **PR strategy:** stack onto #106 (`refactor/skills-discovery-config`).
