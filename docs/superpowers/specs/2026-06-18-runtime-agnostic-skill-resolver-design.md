# Runtime-Agnostic Skill Resolver — Design

**Date:** 2026-06-18
**Status:** Approved (brainstorming), pre-implementation
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

Two modules with a single, well-defined interface between them.

### `skill-resolver.ts` (new) — locates the base directory

```
resolveSkillBase(opts?: {
  env?: NodeJS.ProcessEnv;   // default process.env  (injectable for tests)
  home?: string;             // default os.homedir()  (injectable for tests)
  config?: DesignbookConfig; // for the config `skills` override
}): { base: string; runtime: string } | null
```

Pure decision logic plus filesystem existence checks. Returns the chosen
marketplace/skills base and a `runtime` label (`config` | `claude-code` |
`codex` | `gemini` | `agents` | null). `null` when no plugin base is found
(dev repo → project sources cover it).

A base "contains designbook" iff `deriveSkillSourcesFromBase(base)` yields a
source named `designbook`. This single predicate drives both detection
short-circuits and probe fallthrough, so detection and probing agree.

### `skill-sources.ts` (existing) — expands the base into sources

- `deriveSkillSourcesFromBase(base)` — unchanged (hashed + flat layouts,
  newest-mtime tiebreak).
- `resolveSkillSources(configDir)` — now:
  1. `projectSources` = `<configDir>/.claude|.agents/skills/*` (origin `project`).
  2. `base = resolveSkillBase({ config: loadConfig(configDir) })`.
  3. `pluginSources = base ? deriveSkillSourcesFromBase(base.base) : []`
     (origin `plugin`).
  4. Merge: project sources override plugin sources of the same name.

All sibling skills come from the **same** winning base — never mixed across
runtimes — by expanding one base, not per-skill resolution.

## Resolver precedence (A+B hybrid)

First step that locates a base containing the primary `designbook` skill wins;
project-local skills always override on top.

1. **`config.skills` set** → that base (explicit override; #106 behavior). Done.
2. **detect `CLAUDECODE=1`** → Claude Code:
   - Primary: **PATH-scan** for an entry matching
     `…/plugins/cache/<mp>/designbook(-*)?/<hash>/bin` → marketplace base =
     `dirname(skillDir)`. Uses the live, runtime-injected hash.
   - Fallback: `~/.claude/plugins/cache/designbook` (then newest-mtime per skill).
3. **detect `CODEX_HOME`** → `$CODEX_HOME/skills` (default `~/.codex/skills`).
4. **probe** (no unambiguous signal — Gemini and unknown runtimes), first base
   that contains designbook content, in order:
   `~/.gemini/skills` → `~/.agents/skills` → `~/.codex/skills` →
   `~/.claude/plugins/cache/designbook`.
5. **project-local** sources are always added and override by name.

Steps 2–3 are hard env detection (B); step 4 is probe fallthrough (A).

## Runtime wiring

- CLI entrypoints (`cli/plan.ts`, `cli/workflow.ts`) keep calling
  `resolveSkillSources(configDir)` — no signature change.
- `workflow.ts` runtime schema-resolution (currently reads `config.skills`
  directly) routes through a shared helper that takes `options.config` +
  `process.env`, so it benefits from the full resolver, not just the config key.

## Cross-cutting details

- PATH split via `path.delimiter` (Windows-safe).
- One stderr debug line on resolution: `[designbook] skills: <runtime> → <base>`
  (helps diagnose "Workflow file not found").
- `config.skills` retained as the priority-1 override (escape hatch for unknown
  runtimes / pinned dev setups); `~`/relative paths resolve against the config dir.

## Testing

`resolveSkillBase` takes injected `env` + `home`, pointed at a fixture tree, so
each branch is deterministic:

- Claude Code via PATH-scan (fixture PATH entry with hash) → hashed base.
- Claude Code PATH absent → `~/.claude/plugins/cache/designbook` fallback.
- Codex via `CODEX_HOME` → `$CODEX_HOME/skills` (flat).
- Gemini probe → `~/.gemini/skills` (no env signal).
- `.agents/skills` shared fallback.
- `config.skills` override beats all detection.
- Project-local override beats plugin sources of the same name.
- No content anywhere → `null`.

Existing #106 tests (layout expansion, newest-mtime, sibling derivation,
relative `$ref` re-anchor) stay green unchanged.

## Out of scope (YAGNI)

- Per-runtime tool/command differences (handled by superpowers platform refs).
- Caching the resolution across CLI invocations (each call is cheap: a few
  `existsSync` checks).
- Auto-writing `config.skills` during `install` (the resolver makes it optional).

## Decisions

- **Approach:** A+B hybrid (env-detect for Claude Code/Codex, probe for Gemini
  and unknown).
- **Runtimes:** Claude Code, Codex, Gemini explicitly; `~/.agents/skills` covers
  Copilot and future cross-runtime CLIs for free.
- **PR strategy:** stack onto #106 (`refactor/skills-discovery-config`).
