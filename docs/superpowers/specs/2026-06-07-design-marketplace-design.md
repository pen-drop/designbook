# Designbook Skill Marketplace — Design

Date: 2026-06-07
Status: Approved (Approach A — manifest-only)

## Goal

Distribute the user-facing designbook skills through two channels from the
existing repo, without restructuring it:

1. **Claude Code plugin marketplace** — `/plugin marketplace add pen-drop/designbook`
2. **vercel-labs/skills CLI** — `npx skills add pen-drop/designbook`

Local development stays unchanged: `scripts/setup-workspace.sh` already
symlinks `.agents`/`.claude` into test workspaces.

## Decisions

- **Scope:** user-facing skills only — `designbook` (core, skill name `debo`),
  `designbook-drupal`, `designbook-css-tailwind`, `designbook-stitch`.
  Excluded: `designbook-skill-creator`, `designbook-test`,
  `designbook-addon-skills`, `leando-migrate`.
  `designbook-devtools` is added once it exists.
- **Repo:** marketplace lives in the designbook repo itself
  (`.claude-plugin/marketplace.json`). One source of truth, no sync.
- **Granularity:** one plugin per skill — core plugin `designbook` plus one
  plugin per integration. Users install only what fits their stack.

## Architecture

New file: `.claude-plugin/marketplace.json`.

Each plugin entry uses `strict: false` (marketplace entry is the full plugin
definition, no per-plugin `plugin.json`). The plugin `source` is the skill
directory itself, so only that directory is copied into the plugin cache:

```json
{
  "name": "designbook-drupal",
  "source": "./.agents/skills/designbook-drupal",
  "strict": false,
  "skills": ["./"]
}
```

- Skill files stay canonical in `.agents/skills/` — no moves, no new symlinks.
- Plugin skills are namespaced: core skill installs as `designbook:debo`.

### Hiding internal skills from the skills CLI

The vercel-labs/skills CLI discovers skills by scanning agent directories
(`.agents/skills/`, `.claude/skills/`, …) in addition to manifest paths — the
manifest only *adds* search paths, it never restricts. The CLI's exclusion
mechanism is per-skill frontmatter:

```yaml
metadata:
  internal: true
```

All non-published skills (`designbook-skill-creator`, `designbook-test`,
`designbook-addon-skills`) carry this flag. Hidden skills can
still be installed explicitly with `INSTALL_INTERNAL_SKILLS=1`.

`leando-migrate` is a symlink to an absolute path outside the repo — it is
broken in any clone and therefore invisible to consumers; no flag needed.

## Install paths

| Channel | Command |
| --- | --- |
| Claude Code | `/plugin marketplace add pen-drop/designbook`, then `/plugin install designbook@designbook` (etc.) |
| skills CLI | `npx skills add pen-drop/designbook --skill debo` (or interactive pick) |
| Local dev | `./scripts/setup-workspace.sh <name>` (unchanged) |

## Verification (performed 2026-06-07)

1. `claude plugin validate .` — passed.
2. Local `claude plugin marketplace add` + install of `designbook` and
   `designbook-drupal` — each plugin exposes exactly one skill (`debo`,
   `designbook-drupal`); full skill content present in plugin cache.
   Test installs removed afterwards.
3. `npx skills add <repo> --list` — exactly the 4 published skills.
4. `pnpm check` green.

## Known caveat (follow-up)

The core skill's install workflow resolves the "skills root" by walking up
from the CWD (`.agents/skills/` / `.claude/skills/`). That works for skills
CLI installs (which land in the project tree) but not for Claude Code plugin
installs, where skills live in the plugin cache. The install workflow needs a
plugin-aware skills-root resolution before the marketplace channel is fully
usable end-to-end.

## Out of scope

- `designbook-devtools` (does not exist yet)
- Publishing internal dev skills
- Changes to `setup-workspace.sh`
