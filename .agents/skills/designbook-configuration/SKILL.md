---
name: designbook-configuration
description: Utilities for loading Designbook configuration (designbook.config.yml)
---

# Designbook Configuration

This skill provides utilities to load the `designbook.config.yml` configuration file and expose its values to other skills and workflows.

!IMPORTANT!
Check for designbook.config.yml and check the cmd key. Fallback: npx storybook-addon-designbook. Use this as $DESIGNBOOK_CMD environment variable
## Locating the Config File

Before loading the configuration, find `designbook.config.yml` by traversing up from the current directory:

```bash
# First check current directory, then walk up
if [ -e "$PWD/designbook.config.yml" ]; then
  DESIGNBOOK_CONFIG="$PWD/designbook.config.yml"
else
  dir=$(dirname "$PWD")
  while [ "$dir" != "/" ]; do
    [ -e "$dir/designbook.config.yml" ] && DESIGNBOOK_CONFIG="$dir/designbook.config.yml" && break
    dir=$(dirname "$dir")
  done
fi
```

**If the file is not found:** Stop and ask the user:
- Whether a `designbook.config.yml` should be created
- Or where the config file is located

Do not proceed without a config file.

## Usage

### In Node.js Scripts

```javascript
const { loadConfig } = require('storybook-addon-designbook/config');
const config = loadConfig();
console.log(config.dist); // e.g., "packages/integrations/test-integration-drupal/designbook"
```

### In Bash Scripts

```bash
eval "$(${DESIGNBOOK_CMD} config)"

echo $DESIGNBOOK_CMD
echo $DESIGNBOOK_DIST
echo $DESIGNBOOK_BACKEND
echo $DESIGNBOOK_FRAMEWORK_COMPONENT
echo $DESIGNBOOK_FRAMEWORK_CSS
echo $DESIGNBOOK_TMP
echo $DESIGNBOOK_CSS_APP
echo $DESIGNBOOK_DRUPAL_THEME
echo $DESIGNBOOK_SDC_PROVIDER
```

## Environment Variable Mapping

| Config Key | Env Variable | Example |
|---|---|---|
| `backend` | `DESIGNBOOK_BACKEND` | `drupal` |
| `frameworks.component` | `DESIGNBOOK_FRAMEWORK_COMPONENT` | `sdc` |
| `frameworks.css` | `DESIGNBOOK_FRAMEWORK_CSS` | `daisyui` |
| `dist` | `DESIGNBOOK_DIST` | `packages/.../designbook` |
| `tmp` | `DESIGNBOOK_TMP` | `packages/.../designbook/tmp` |
| `extensions` | `DESIGNBOOK_EXTENSIONS` | `layout_builder` (comma-separated) |
| `css.app` | `DESIGNBOOK_CSS_APP` | `packages/.../css/app.src.css` |
| `drupal.theme` | `DESIGNBOOK_DRUPAL_THEME` | `packages/.../test-integration-drupal` |
| _(derived)_ | `DESIGNBOOK_SDC_PROVIDER` | `test_integration_drupal` |

> `DESIGNBOOK_SDC_PROVIDER` is auto-derived: `basename(DESIGNBOOK_DRUPAL_THEME)` with `-` → `_`.

## Configuration File

The `designbook.config.yml` file should be placed in the project root.

```yaml
backend: "drupal"
extensions:
  - layout_builder
frameworks:
  component: "sdc"
  css: "daisyui"
dist: "packages/integrations/test-integration-drupal/designbook"
tmp: "tmp"
css:
  app: "packages/integrations/test-integration-drupal/css/app.src.css"
drupal:
  theme: "packages/integrations/test-integration-drupal"
```

> `extensions` declares backend capabilities affecting content composition. Common values:
> - Drupal: `layout_builder`, `canvas`, `experience_builder`, `paragraphs`
> - WordPress: `gutenberg`
> - Empty array = all content is structured (default)

## Workflow Rules and Tasks

The config MAY include a `workflow` key with per-stage rules and task instructions. These are loaded by the AI during workflow execution — no CLI support needed.

```yaml
workflow:
  rules:
    create-component:
      - "All interactive elements require ARIA labels"
    debo-design-component:dialog:
      - "Always ask for the client's Figma link"

  tasks:
    create-component:
      - "After creation, verify the component renders in Storybook"
```

| Config Key | Type | Purpose |
|---|---|---|
| `workflow.rules.<stage>` | `string[]` | Additional constraints applied silently during the stage, additive to skill rule files |
| `workflow.tasks.<stage>` | `string[]` | Additional instructions appended to task file content for the stage |

Stage keys match canonical stage names (e.g. `create-component`) or workflow-scoped dialog stages (e.g. `debo-design-component:dialog`).
