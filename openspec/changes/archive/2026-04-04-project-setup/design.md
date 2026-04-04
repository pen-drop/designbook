## Context

The project has three parts — the `designbook` core skill, the `storybook-addon-designbook` TypeScript package, and integration skills (`designbook-css-tailwind`, `designbook-drupal`, etc.) — but this architecture is not documented anywhere Claude reads at startup.

Current state:
- `CLAUDE.md` delegates to `agents.md`, which only has code quality rules
- `openspec/config.yaml` has no `context:` — Claude gets no project background when creating OpenSpec artifacts
- `designbook-addon-skills/SKILL.md` is labeled as a meta-skill for all designbook skills, but should only cover the Storybook addon
- `scripts/setup-workspace.sh` symlinks `.agents`/`.claude` back to `REPO_ROOT`, which breaks isolation in git worktrees
- No skill documents the 4-level model (workflow → task → blueprint/rule) as an explicit architecture

## Goals / Non-Goals

**Goals:**
- Claude always has project context when working on any artifact (via `CLAUDE.md` + `openspec/config.yaml`)
- Skill changes are guided by explicit principles (4-level model, task = what, blueprint = overridable how, rule = hard constraint)
- Workspace setup is idempotent, isolated, and works correctly in git worktrees
- `designbook-addon-skills` scope is clear: Storybook addon TypeScript development only

**Non-Goals:**
- Changing the skill execution engine or workflow format
- Adding new workflows or integration skills
- Documenting the Storybook addon internals

## Decisions

**D1: Remove `agents.md`, consolidate into `CLAUDE.md`**
`CLAUDE.md` is the file Claude Code loads. Having a second file it references adds indirection with no benefit. All rules move directly into `CLAUDE.md`.

**D2: New `designbook-skill-creator` skill for the skill architecture**
Rather than embedding skill design principles in `agents.md`/`CLAUDE.md` (too long for a startup file), create a dedicated skill. `CLAUDE.md` references it with: "When modifying any `.agents/skills/` file, load `designbook-skill-creator` first."
This keeps `CLAUDE.md` concise while making the principles available on demand.

**D3: `openspec/config.yaml` context = condensed architecture overview**
The `context:` field is included in every OpenSpec artifact creation prompt. It should contain: project one-liner, the three parts, the 4-level skill model summary, and the key principle (tasks = what, blueprints = overridable how, rules = hard). This means even ad-hoc OpenSpec changes get project context.

**D4: `setup-workspace.sh` always rebuilds, copies instead of symlinks**
Rationale: in a git worktree, `REPO_ROOT` resolves to the worktree path. Symlinking back to it means the workspace uses the worktree's current `.agents`/`.claude` — which is correct for testing skill changes, but the current script exits if the workspace already exists, preventing a rebuild. Changing to always-rebuild + copy makes the workspace a true snapshot of the worktree state at setup time. The copy is also safer: workspace changes cannot accidentally mutate skill files.

## Risks / Trade-offs

- **`CLAUDE.md` grows longer** → Mitigated by keeping the skill architecture as a short reference block, with detail delegated to `designbook-skill-creator`
- **Copy vs symlink for `.agents`/`.claude`** → Workspace won't auto-reflect skill edits after setup. This is intentional: explicit rebuild required for new changes. For rapid iteration, developer runs the script again.
- **`openspec/config.yaml` context length** → Keep under ~20 lines; OpenSpec prepends it to every artifact prompt, so verbosity has a cost.

## Open Questions

_None._

## Resolved

- **`designbook-skill-creator` user-invocable**: `true` — invocable as a slash command for explicit skill authoring sessions.
