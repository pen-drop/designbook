# Test Workspace: Drupal

This is a test workspace for the Drupal integration. It is a standalone git repo created by `setup-workspace.sh`.

## OpenSpec

The `openspec/` directory is a symlink to the repo root's `openspec/`. All changes and specs are shared across the entire project — not scoped to this workspace.

## Symlinks

| Path | Target | Purpose |
|------|--------|---------|
| `.claude/` | repo root `.claude/` | Claude Code skills, commands, settings |
| `.cursor/` | repo root `.cursor/` | Cursor skills, commands, MCP config |
| `.codex/` | repo root `.codex/` | Codex skills, commands |
| `.agents` | repo root `.agents` | Skill source files (shared by all agents) |
| `openspec/` | repo root `openspec/` | Shared changes and specs |
| `AGENTS.md` | workspace `CLAUDE.md` | Rules file read by Codex |
| `.cursorrules` | workspace `CLAUDE.md` | Rules file read by Cursor |
