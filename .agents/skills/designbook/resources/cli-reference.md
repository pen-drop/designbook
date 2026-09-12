# CLI Reference

All commands are invoked via `_debo` (alias for `npx storybook-addon-designbook`).

```bash
_debo() { npx storybook-addon-designbook "$@"; }
eval "$(_debo config)"
```

## Skill content discovery

`_debo` discovers workflow/task/rule/blueprint/schema files for a skill. In a
dev repo the skill lives under `<project>/.agents/skills/designbook/...`, which
the CLI finds automatically. When Designbook is installed as a **plugin**, the
skills live in a runtime-specific cache — the CLI **auto-detects** it, no config
needed:

| Runtime | Detected via | Skill location |
|---|---|---|
| Claude Code | `CLAUDECODE` / plugin `bin` on `PATH` | `~/.claude/plugins/cache/designbook/<skill>/<hash>/` |
| Codex | `CODEX_HOME` | `$CODEX_HOME/skills/` (default `~/.codex/skills/`) |
| Gemini CLI | `~/.gemini/skills/` | `~/.gemini/skills/` |
| cross-runtime | — | `~/.agents/skills/` (Codex/Gemini/Copilot) |

Resolution order: explicit `skills` config → Claude Code → Codex → Gemini →
`~/.agents/skills`. The first that actually contains designbook content wins;
a project-local skill of the same name always overrides the plugin copy. All
sibling skills (`designbook-drupal`, `designbook-css-tailwind`,
`designbook-stitch`) come from the same source, and cross-skill `$ref`s/rules
resolve into them.

### `skills` — explicit override (optional)

Only needed for an unsupported runtime or a pinned dev setup. Set it to the
**base directory that contains the per-skill folders** (no `<hash>` segment);
`~`/relative paths resolve against the config file's directory:

```yaml
# designbook.config.yml
skills: ~/.claude/plugins/cache/designbook
```

Set `DESIGNBOOK_DEBUG=1` to print the resolved runtime + base on stderr.
Set `DESIGNBOOK_DISABLE_AUTODETECT=1` to turn off runtime detection entirely
(the explicit `skills` override still applies) — for project-local-only setups.

## Command Groups

- [cli-config.md](cli-config.md) — `config` — Shell exports for `$DESIGNBOOK_*` variables
- [cli-storybook.md](cli-storybook.md) — `storybook` — Storybook daemon lifecycle (start, stop, status, logs, restart)
- [cli-workflow.md](cli-workflow.md) — `intake` + `plan` — Resolve the planning context; `plan build` (durable, `--ephemeral`, or `--output`); execution against the sealed MD plan; `reference approval-write` / `approval-check`
- [cli-validate.md](cli-validate.md) — `validate` — Schema validation for data, tokens, components, data-model, entity-mapping
- [cli-playwright.md](cli-playwright.md) — `playwright-cli` — Browser automation for screenshots, DOM extraction, and element interaction
