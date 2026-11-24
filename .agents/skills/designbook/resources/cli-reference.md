# CLI Reference

All commands are invoked via `_debo` (alias for `npx storybook-addon-designbook`).

```bash
_debo() { npx storybook-addon-designbook "$@"; }
eval "$(_debo config)"
```

## Skill content discovery

`_debo` loads skill content (workflows, tasks, rules, blueprints, schemas) by
skill name, first source wins:

1. project-local `.agents/skills/<name>/`
2. `skills` entries in `designbook.config.yml`, in listed order — npm package
   names (resolved from the config dir's `node_modules`) or paths, each a
   directory with `skills/<name>/`
3. the core and integration skills bundled in `storybook-addon-designbook`

```yaml
# designbook.config.yml
skills: ['@acme/designbook-skills', ./tools/local-skills]
```

Set `DESIGNBOOK_DEBUG=1` to print each package root on stderr.

## Command Groups

- [cli-config.md](cli-config.md) — `config` — Shell exports for `$DESIGNBOOK_*` variables
- [cli-storybook.md](cli-storybook.md) — `storybook` — Storybook daemon lifecycle (start, stop, status, logs, restart)
- [cli-workflow.md](cli-workflow.md) — `intake` + `plan` — Resolve the planning context; `plan build` (durable, `--ephemeral`, or `--output`; `--format text|json`); `plan tree` (sealed plan or task-list preview); execution against the sealed MD plan; `reference approval-write` / `approval-check`
- [cli-validate.md](cli-validate.md) — `validate` — Schema validation for data, tokens, components, data-model, entity-mapping
- [cli-playwright.md](cli-playwright.md) — `playwright-cli` — Browser automation for screenshots, DOM extraction, and element interaction
