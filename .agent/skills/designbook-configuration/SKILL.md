---
name: designbook-configuration
description: Utilities for loading Designbook configuration (designbook.config.yml)
---

# Designbook Configuration

This skill provides utilities to load the `designbook.config.yml` configuration file and expose its values to other skills and workflows.

## Usage

### In Node.js Scripts

```javascript
const { loadConfig } = require('storybook-addon-designbook/config');
const config = loadConfig();
console.log(config.dist); // e.g., "packages/integrations/test-integration-drupal/designbook"
```

### In Bash Scripts

```bash
eval "$(npx storybook-addon-designbook config)"

echo $DESIGNBOOK_DIST
echo $DESIGNBOOK_BACKEND
echo $DESIGNBOOK_FRAMEWORK_COMPONENT
echo $DESIGNBOOK_FRAMEWORK_CSS
echo $DESIGNBOOK_TMP
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
| `drupal.theme` | `DESIGNBOOK_DRUPAL_THEME` | `packages/.../test-integration-drupal` |
| _(derived)_ | `DESIGNBOOK_SDC_PROVIDER` | `test_integration_drupal` |

> `DESIGNBOOK_SDC_PROVIDER` is auto-derived: `basename(DESIGNBOOK_DRUPAL_THEME)` with `-` → `_`.

## Configuration File

The `designbook.config.yml` file should be placed in the project root.

```yaml
backend: "drupal"
frameworks:
  component: "sdc"
  css: "daisyui"
dist: "packages/integrations/test-integration-drupal/designbook"
tmp: "tmp"
drupal:
  theme: "packages/integrations/test-integration-drupal"
```
