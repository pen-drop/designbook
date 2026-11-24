# config

Print shell export statements for the resolved `designbook.config.yml` / `.yaml`.

```text
Usage: storybook-addon-designbook config [options]

Output shell export statements for designbook.config.yml values

Options:
  -h, --help  display help for command
```

```bash
npx storybook-addon-designbook config
```

Walk-up discovery and path resolution are implemented in `packages/storybook-addon-designbook/src/shared/config.ts`. Observed keys from `fixtures/vue-storybook`:

```text
export DESIGNBOOK_BACKEND='none'
export DESIGNBOOK_EXTENSIONS='website,storybook'
export DESIGNBOOK_EXTENSION_SKILLS=''
export DESIGNBOOK_FRAMEWORK_COMPONENT='vue'
export DESIGNBOOK_FRAMEWORK_CSS='tailwind'
export DESIGNBOOK_HOME='…/fixtures/vue-storybook'
export DESIGNBOOK_DATA='…/fixtures/vue-storybook/designbook'
```

Also emitted: `DESIGNBOOK_DIRS_*`, `DESIGNBOOK_CSS_APP`, `DESIGNBOOK_CSS_DIR`, `DESIGNBOOK_COMPONENT_NAMESPACE`, `DESIGNBOOK_COMPONENT_SRC`, `DESIGNBOOK_TECHNOLOGY`, `DESIGNBOOK_CMD`, and a `designbook()` shell function wrapping `designbook.cmd`.

There are no extra flags. Working directory selects the config file. `DESIGNBOOK_EXTENSION_SKILLS` is empty unless extension objects declare `skill`. `frameworks` becomes `DESIGNBOOK_FRAMEWORK_*` (singular FRAMEWORK) in `buildEnvMap`.

Use this command to confirm an extension or framework is selected before debugging intake. See [project configuration](/extend/configuration).
