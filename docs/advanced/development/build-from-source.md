# Build from source

Build the addon and run Storybook from this repository.

**You need:** Node matching the CI matrix (20.19 or 22.12), pnpm 9.1.0 (`packageManager` in the root `package.json`), and a clone of `pen-drop/designbook`.

1. Install and build the addon.

```bash
pnpm install
pnpm --filter storybook-addon-designbook build
```

**AI prompt**

```text
Install pnpm workspace dependencies and build storybook-addon-designbook.
Do not start Drupal.
```

2. Start the addon watcher plus Storybook. Root `pnpm run dev` runs `clean` + `build` on the addon, sets `DESIGNBOOK_HOME` to `workspaces/drupal`, and starts Storybook via the CLI with `--force`. That path expects a test workspace. For addon-only iteration:

```bash
pnpm run dev:addon
pnpm run dev:integration:drupal
```

`dev:addon` is `build:watch` on the addon. `dev:integration:drupal` starts the Drupal integration Storybook package.

3. Confirm the CLI binary exists at `packages/storybook-addon-designbook/dist/cli.js` and `node packages/storybook-addon-designbook/dist/cli.js --help` matches [CLI overview](/advanced/cli/).

**Done when:** `pnpm --filter storybook-addon-designbook build` succeeds and `--help` lists the families on the CLI overview page.

Local development skills are the worktree's `.agents` tree. Project-local skills win over the skills bundled in the addon package, so worktree edits take effect without a rebuild. A new top-level bundle that should ship must be added to `packages/storybook-addon-designbook/scripts/copy-skills.mjs`.

Releases are cut by CI (`.github/workflows/release.yml`): pushes to `next` publish a `next` prerelease, the merge of `next` into `main` publishes the version derived from Conventional Commits. This page does not document publishing npm packages.
