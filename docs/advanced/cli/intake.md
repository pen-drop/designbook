# intake

Resolve the config-filtered planning context for a workflow. This is the first command of every Designbook skill intake.

```text
Usage: storybook-addon-designbook intake [options] <workflow>

Resolve the config-filtered intake planning context for a workflow

Options:
  --palette            Emit only the lean task palette (task names +
                       params_schema), not the embedded context
  --config-dir <path>  Workspace dir to resolve skills root and sources from
  --config <path>      Draft configuration JSON (skips designbook.config.yml
                       lookup)
  -h, --help           display help for command
```

```bash
npx storybook-addon-designbook intake tokens
npx storybook-addon-designbook intake extract-reference --palette
npx storybook-addon-designbook intake install --config /tmp/install-draft.json
```

`<workflow>` is a registered workflow id (`install`, `vision`, `tokens`, `css-generate`, `extract-reference`, …). The agent must run this CLI and read stdout. A nonzero exit ends the work with that message.

`--palette` is the discovery check used in [configuration](/extend/configuration): stitch rules appear only when `extensions` includes `stitch`. `--config-dir` points at a fixture or theme tree. `--config` is the install path when YAML does not exist yet.

Without `--palette`, stdout includes embedded rule bodies (`intake_context`). That payload is large; prefer `--palette` when you only need to know which tasks matched.
