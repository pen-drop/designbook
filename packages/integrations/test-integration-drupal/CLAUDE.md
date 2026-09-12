# Test Workspace: Drupal

This is a test workspace for the Drupal integration. It is a standalone git repo created by `setup-workspace.sh`.

## CLI

`_debo` / `npx storybook-addon-designbook` is the command contract. Run the
command; stdout and stderr are the spec. Skill descriptions fire the skill;
they are not the command spec. Every intake starts with `workflow discover
<id>`. Source dumps with `_debo reference save --reference <dir> --url <url>`.
Screenshots with `_debo reference capture-image` (or `_debo capture matrix`).
Asset files with `_debo reference capture-file`. A nonzero CLI exit ends the
work with that exact message.

## Symlinks

| Path | Target | Purpose |
|------|--------|---------|
| `.claude/` | repo root `.claude/` | Claude Code skills, commands, settings |
| `.cursor/` | repo root `.cursor/` | Cursor skills, commands, MCP config |
| `.codex/` | repo root `.codex/` | Codex skills, commands |
| `.agents` | repo root `.agents` | Skill source files (shared by all agents) |
| `AGENTS.md` | workspace `CLAUDE.md` | Rules file read by Codex |
| `.cursorrules` | workspace `CLAUDE.md` | Rules file read by Cursor |
