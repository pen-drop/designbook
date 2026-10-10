# Project configuration

`packages/storybook-addon-designbook/src/shared/config.ts` is the source of truth. Simplified lookup prose elsewhere is ignored when it disagrees with this module.

## Discovery

`findConfig` starts at the working directory (or `--config-dir`) and walks up to the filesystem root. In each directory it checks `designbook.config.yml`, then `designbook.config.yaml`. The first hit wins.

Without a file, defaults are `technology: html` and `data` = `<cwd>/designbook`. Writing that default into this Designbook monorepo fails: `assertNotRepoRoot` rejects a data directory whose parent has both `.git` and `pnpm-workspace.yaml`.

## Path resolution (after parse)

Nested YAML is flattened (`dirs.css.tokens` → `dirs.css.tokens`). Arrays such as `extensions` stay arrays.

| Key | Resolution |
|---|---|
| `workspace` | Absolute, relative to the config directory; default = config directory (`DESIGNBOOK_WORKSPACE`) |
| `designbook.home` | Absolute, relative to config dir; default = workspace (`DESIGNBOOK_HOME`) |
| `designbook.data` | `home/<name>`; default `home/designbook` (`DESIGNBOOK_DATA`) |
| `dirs.*` | Absolute, relative to config dir |
| `css.app` | Absolute; `css.dir` is its parent |
| `skills` | `~` expanded, then relative to config dir. Plugin cache base such as `~/.claude/plugins/cache/designbook` |
| `sessions.*` | Playwright storage-state JSON, `~` expanded. Capture takes `--session <name>`, never a path. `anonymous` needs no entry |
| `features.<name>: false` | Disables a feature; default is on |

`extensions` entries are strings or `{id, url?, skill?}`. `config` / `buildEnvMap` emit `DESIGNBOOK_EXTENSIONS` (comma-separated ids) and `DESIGNBOOK_EXTENSION_SKILLS` (declared `skill` values). `frameworks.css` becomes `DESIGNBOOK_FRAMEWORK_CSS`.

Skills lookup (`resolveSkillsRoot`) walks up from the config directory trying `.claude`, `.agents`, then a `skills/` directory on the folder itself.

## Walkthrough: stitch on versus stitch off

Canonical files (immutable sources in this repository):

- [fixtures/drupal-stitch/designbook.config.yml](https://github.com/pen-drop/designbook/blob/main/fixtures/drupal-stitch/designbook.config.yml)
- [fixtures/drupal-petshop/designbook.config.yml](https://github.com/pen-drop/designbook/blob/main/fixtures/drupal-petshop/designbook.config.yml)
- Stitch rules: `.agents/skills/designbook-stitch/rules/stitch-import.md` and `provide-stitch-url.md` (`filter: extensions: stitch`)

Stitch excerpt:

```yaml
backend: drupal
frameworks:
  component: sdc
  css: tailwind
extensions:
  - id: website
  - id: storybook
  - id: canvas
    url: https://www.drupal.org/project/canvas
  - id: stitch
  - id: google-fonts
```

Observed against those fixtures with the built CLI (`npx storybook-addon-designbook`; local binary `packages/storybook-addon-designbook/dist/cli.js`):

```bash
npx storybook-addon-designbook config
npx storybook-addon-designbook intake extract-reference --palette
```

From `fixtures/drupal-stitch`, `config` prints `DESIGNBOOK_EXTENSIONS='website,storybook,canvas,stitch,google-fonts'`. The extract-reference palette includes `ctx:stitch-import` and `ctx:provide-stitch-url` sourced from `designbook-stitch`. From `fixtures/drupal-petshop` (`extensions` is only `website` and `storybook`), the same intake has neither file. Disabling `stitch` removes the contribution; the skill files can remain installed.

`frameworks.css: tailwind` similarly sets `DESIGNBOOK_FRAMEWORK_CSS='tailwind'` (vue-storybook and stitch fixtures) and selects Tailwind CSS generation rules. That selector is independent of the `extensions` array.
