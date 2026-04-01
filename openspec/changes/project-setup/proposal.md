## Why

The project has three distinct parts (core skill, Storybook addon, integration skills) but no document describes how they relate, what principles govern them, or what development rules apply. Claude makes mistakes when modifying skills ad-hoc because no authoritative reference is loaded — the current `agents.md` only contains code quality rules, and `openspec/config.yaml` has no project context.

## What Changes

- **Remove `agents.md`** — consolidate all project rules directly into `CLAUDE.md`
- **Expand `CLAUDE.md`** — add skill architecture map, development rules (workspace setup, worktree behavior)
- **Populate `openspec/config.yaml` context** — project architecture summary loaded into every OpenSpec artifact
- **Create `designbook-skill-creator` skill** — authoritative reference for the 4-level skill model (workflow → task → blueprint/rule), principles, and skill map
- **Correct `designbook-addon-skills/SKILL.md`** — narrow scope to Storybook addon only (currently described as meta-skill for all designbook skills)
- **Fix `scripts/setup-workspace.sh`** — always rebuild from scratch, copy `.agents`/`.claude` from CWD instead of symlinking to repo root

## Capabilities

### New Capabilities

- `designbook-skill-creator`: Meta-skill documenting the 4-level skill model, design principles (tasks = what, blueprints = overridable how, rules = hard constraints), and the complete skill map across all three project parts

### Modified Capabilities

- `onboarding-documentation`: Development setup rules now include workspace lifecycle (always rebuild) and worktree behavior

## Impact

- `CLAUDE.md` — primary change, all project rules consolidated here
- `agents.md` — deleted
- `openspec/config.yaml` — context field populated
- `.agents/skills/designbook-skill-creator/` — new directory
- `.agents/skills/designbook-addon-skills/SKILL.md` — scope correction
- `scripts/setup-workspace.sh` — behavior change (always rebuild, copy not symlink)
