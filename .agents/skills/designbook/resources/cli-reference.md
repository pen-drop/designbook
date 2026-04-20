# CLI Reference

All commands are invoked via `_debo` (alias for `npx storybook-addon-designbook`).

```bash
_debo() { npx storybook-addon-designbook "$@"; }
eval "$(_debo config)"
```

## Command Groups

- [cli-config.md](cli-config.md) — `config` — Shell exports for `$DESIGNBOOK_*` variables
- [cli-storybook.md](cli-storybook.md) — `storybook` — Storybook daemon lifecycle (start, stop, status, logs, restart)
- [cli-story.md](cli-story.md) — `story` — Story entity loading, creation, and checks
- [cli-workflow.md](cli-workflow.md) — `workflow` — Workflow lifecycle (create, done, result, get-file, instructions, list, wait, abandon, merge)
- [cli-validate.md](cli-validate.md) — `validate` — Schema validation for data, tokens, components, data-model, entity-mapping
- [cli-playwright.md](cli-playwright.md) — `playwright-cli` — Browser automation for screenshots, DOM extraction, and element interaction
