# CLI overview

The Designbook CLI is `npx storybook-addon-designbook`. Inside skills it is also `_debo`. There are no `/debo-*` shell aliases.

Verify syntax against a just-built binary:

```bash
pnpm --filter storybook-addon-designbook build
node packages/storybook-addon-designbook/dist/cli.js --help
```

Top-level help (built addon):

```text
Usage: storybook-addon-designbook [options] [command]

Designbook CLI utilities

Options:
  -h, --help                   display help for command

Commands:
  config                       Output shell export statements for
                               designbook.config.yml values
  validate                     Validate Designbook artifacts against schemas
  guard-css [options]          Verify token vars and fonts resolve in a compiled
                               stylesheet probe
  intake [options] <workflow>  Resolve the config-filtered intake planning
                               context for a workflow
  plan                         Build and execute a saved MD workflow plan
  verify                       Design-verify scoring
  storybook                    Storybook process management
  compare-images [options]     Deterministic pixel-diff (odiff) of a reference
                               vs a captured screenshot.
  reference                    Save, capture, validate and query a capture
                               revision through the CLI.
  capture                      Capture screenshots (matrix mode reads a
                               meta.yml).
  help [command]               display help for command
```

Each family has its own page with every registered child and the defaults from `--help`. Run commands from the project or theme directory so config walk-up succeeds. `--config-dir` and `--config` apply where the family documents them (`intake`, `plan build`).
