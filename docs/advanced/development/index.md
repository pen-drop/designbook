# Development

Maintainer procedures for this repository.

- [Build from source](/advanced/development/build-from-source) — addon watcher, Storybook, local skills
- [Checks](/advanced/development/checks) — `pnpm check` (typecheck, lint, test)
- [Test workspaces](/advanced/development/test-workspaces) — `./scripts/setup-workspace.sh`
- [Skill creator](/advanced/development/skill-creator) — guardrails before editing skill files
- [Architecture](/advanced/development/architecture) — three parts plus the website package
- [Write the docs](/advanced/development/write-docs) — handbook rules, gates, publication

Canonical skill sources are `.agents/skills/`. `.claude/skills/` is a symlink and must not be edited separately. Claude Code in this repo uses the worktree's local skills through `.claude-plugin/marketplace.json`. Project settings disable installed Designbook plugins so commands cannot load files from another checkout.
