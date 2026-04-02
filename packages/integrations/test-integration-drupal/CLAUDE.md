# Test Workspace: Drupal

This is a test workspace for the Drupal integration. It is a standalone git repo created by `setup-workspace.sh`.

## OpenSpec

The `openspec/` directory is a symlink to the repo root's `openspec/`. All changes and specs are shared across the entire project — not scoped to this workspace.

## Symlinks

| Path | Target | Purpose |
|------|--------|---------|
| `.claude/` | repo root `.claude/` | Skills, commands, settings |
| `openspec/` | repo root `openspec/` | Shared changes and specs |
| `.agents` | repo root `.agents` | Skill source files (via `.claude`) |
