---
name: designbook-configuration
description: Utilities for loading Designbook configuration (designbook.config.yml)
---

# Designbook Configuration

This skill provides utilities to load the `designbook.config.yml` configuration file and expose its values to other skills and workflows.

## Usage

### In Node.js Scripts

```javascript
const { loadConfig } = require('../../designbook-configuration/scripts/load-config.js');
const config = loadConfig();
console.log(config.dist); // e.g., "packages/integrations/test-integration-drupal/designbook"
```

### In Bash Scripts

```bash
source .agent/skills/designbook-configuration/scripts/set-env.sh

echo $DESIGNBOOK_DIST
echo $DESIGNBOOK_TECHNOLOGY
echo $DESIGNBOOK_TMP
```

## Configuration File

The `designbook.config.yml` file should be placed in the project root.

```yaml
technology: "drupal"
dist: "packages/integrations/test-integration-drupal/designbook"
tmp: "tmp"
```
