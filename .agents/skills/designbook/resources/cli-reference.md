# CLI Reference

All commands are invoked via `_debo` (alias for `npx storybook-addon-designbook`).

```bash
_debo() { DESIGNBOOK_SKILLS="<this skill's base directory>" npx storybook-addon-designbook "$@"; }
eval "$(_debo config)"
```

## `DESIGNBOOK_SKILLS` — skill content discovery

`_debo` discovers workflow/task/rule/blueprint/schema files for a skill. In a
dev repo the skill lives under `<project>/.agents/skills/designbook/...`, which
the CLI finds automatically. When Designbook is installed as a **Claude Code
plugin**, the skills instead live in the plugin cache
(`~/.claude/plugins/cache/designbook/<skill>/<hash>/...`), which the CLI cannot
locate on its own.

Always set `DESIGNBOOK_SKILLS` to **this skill's base directory** — the absolute
path Claude Code injects when it loads the skill (shown as
`Base directory for this skill: <path>`). It is a colon-separated list of skill
content roots; passing only the `designbook` root is enough: the CLI
auto-derives the three sibling skills (`designbook-drupal`,
`designbook-css-tailwind`, `designbook-stitch`) by matching the same `<hash>`
segment under the plugin cache. Cross-skill `$ref`s and rules resolve into those
siblings automatically.

A project-local skill of the same name (under `<project>/.agents/skills/`) always
overrides the plugin copy.

## Command Groups

- [cli-config.md](cli-config.md) — `config` — Shell exports for `$DESIGNBOOK_*` variables
- [cli-storybook.md](cli-storybook.md) — `storybook` — Storybook daemon lifecycle (start, stop, status, logs, restart)
- [cli-story.md](cli-story.md) — `story` — Story entity loading, creation, and checks
- [cli-workflow.md](cli-workflow.md) — `workflow` — Workflow lifecycle (create, done, result, get-file, instructions, list, wait, abandon, merge)
- [cli-validate.md](cli-validate.md) — `validate` — Schema validation for data, tokens, components, data-model, entity-mapping
- [cli-playwright.md](cli-playwright.md) — `playwright-cli` — Browser automation for screenshots, DOM extraction, and element interaction
