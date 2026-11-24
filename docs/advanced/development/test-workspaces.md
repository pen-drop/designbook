# Test workspaces

A test workspace is a standalone directory for exercising integrations against a real Storybook. It is not a git worktree. Every environment that needs Drupal or Tailwind against Storybook rebuilds one.

**You need:** this repository (repo root or a git worktree root) and the script `scripts/setup-workspace.sh`.

1. Create or rebuild a workspace.

```bash
./scripts/setup-workspace.sh <name>
```

**AI prompt**

```text
Rebuild a Drupal test workspace with ./scripts/setup-workspace.sh from this
worktree. Do not start ddev unless I ask.
```

Default name is `drupal`. Default directory is `workspaces/<name>`. `--into <dir>` overrides the path. `--feature name=value` and `--features a=on,b=off` write feature flags into that workspace's `designbook.config.yml`.

2. Know what the script copies. From its header: it **always rebuilds from scratch** (removes any existing workspace first). Layout is a Drupal fixture at the workspace root and the theme fixture at `web/themes/custom/test_integration_drupal`. It **copies** `.agents`, `.claude`, `.cursor`, and `.codex` from the current working directory, so a git worktree's skill changes are what the workspace sees. Those directories are copies, not symlinks.

3. ddev is configured with a worktree-namespaced project and is **not** started. Use `./scripts/start-drupal-workspace.sh <name>` when Drupal must run.

If `<name>` matches `fixtures/<name>/designbook.config.yml`, the script reads `backend` from that fixture. Otherwise it falls back to the Drupal layout.

**Done when:** `workspaces/<name>` exists, contains the copied skill trees, and Storybook can be started from the theme directory.

`workspaces/` is gitignored. Re-run the script to pick up skill edits.
