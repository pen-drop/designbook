# CLI: config

Output shell export statements for `designbook.config.yml` values. Used to bootstrap every Bash block.

```bash
 config
```

No options. Reads `designbook.config.yml` from the current directory (or `$DESIGNBOOK_HOME`).

**Output:** Shell export statements, one per line:

```bash
export DESIGNBOOK_HOME='/abs/path/to/theme'
export DESIGNBOOK_DATA='/abs/path/to/.designbook'
export DESIGNBOOK_URL='http://localhost:6006'
export DESIGNBOOK_EXTENSIONS='designbook-css-tailwind,designbook-drupal'
export DESIGNBOOK_EXTENSION_SKILLS='designbook-css-tailwind,designbook-drupal'
designbook() { (cd '/abs/path/to/theme' && npx storybook dev "$@"); }
export DESIGNBOOK_CMD='designbook'
```

Key variables:
- `DESIGNBOOK_HOME` — theme/Storybook app directory
- `DESIGNBOOK_DATA` — `.designbook` data directory (tokens, sections, workflows)
- `DESIGNBOOK_URL` — Storybook base URL
- `DESIGNBOOK_CMD` — shell function that starts the Storybook dev server (not the CLI)
- `DESIGNBOOK_EXTENSIONS` — comma-separated extension IDs
- `DESIGNBOOK_EXTENSION_SKILLS` — comma-separated skill IDs from extensions

**Usage:** Always `eval` at the top of every Bash block:

```bash
_debo() { npx storybook-addon-designbook "$@"; }
eval "$(_debo config)"
```

> **Important:** `DESIGNBOOK_CMD` / `designbook()` starts the Storybook dev server — it is **not** the CLI entry point. Always use `_debo` for CLI commands.
