# Test Workspace: React (backend: none)

This is a test workspace for the React Storybook integration (`backend: none`,
`frameworks.component: react`). It is a standalone git repo created by
`setup-workspace.sh`, materialized directly at the workspace root — there is
no Drupal theme nesting (no `web/themes/custom/...`).

## CLI

`_debo` / `npx storybook-addon-designbook` is the command contract. Run the
command; stdout and stderr are the spec. Every intake starts with `workflow
discover <id>`.

## Symlinks

| Path | Target | Purpose |
|------|--------|---------|
| `.claude/` | repo root `.claude/` | Claude Code skills, commands, settings |
| `.cursor/` | repo root `.cursor/` | Cursor skills, commands, MCP config |
