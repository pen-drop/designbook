# Troubleshooting

Concrete failures during first use, and what to ask or run.

## The agent cannot find Designbook

Confirm both parts of the [install](/get-started/install): `storybook-addon-designbook` in the project's `package.json`, and the `designbook` entry skill (Claude Code: `/plugin install designbook@designbook` after `/plugin marketplace add pen-drop/designbook`; other agents: `npx skills add pen-drop/designbook --skill designbook`). Restart the agent. Integrations such as Drupal, Stitch and Figma ship inside the npm package and need no separate install.

## `intake` cannot find a config

The CLI walks up from the current directory looking for `designbook.config.yml` or `designbook.config.yaml`. Run from the project (or Storybook theme) directory. Pass `--config-dir` to point at that tree, or `--config` with a draft JSON during install before the YAML exists.

## CLI refuses to write data at the repo root

`loadConfig` rejects a `DESIGNBOOK_DATA` directory whose parent is both a git root and a pnpm workspace. That protects this Designbook repository. Run from a workspace theme directory (`workspaces/<name>/web/themes/custom/<theme>`) or set `designbook.data` explicitly in a project that is not this monorepo.

## Storybook does not start

```bash
npx storybook-addon-designbook storybook status
npx storybook-addon-designbook storybook logs
npx storybook-addon-designbook storybook start --force
```

Confirm `designbook.cmd` in config (often `npx storybook dev`) and that you are in `designbook.home`.

## A contribution you expected is missing

Installing a skill file is not enough. The project config must select it: `backend`, `frameworks.*`, and `extensions` IDs. `npx storybook-addon-designbook config` prints `DESIGNBOOK_EXTENSIONS` and `DESIGNBOOK_FRAMEWORK_*`. Compare with [configuration](/extend/configuration).

## The agent typed a `/debo-*` shell command

Namespaced skills are agent skills, not CLI aliases. The only command surface is `_debo` / `npx storybook-addon-designbook`. A nonzero CLI exit is the error; read that message.

## Visual check against Drupal

Current verification is `sync-verify`, not `config-verify`. Ask the agent to run the `sync-verify` workflow.
