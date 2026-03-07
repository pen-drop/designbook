---
description: Process tokens input (YAML/JSON string or file path) and save to designbook/design-system/design-tokens.yml
---
This step receives a YAML/JSON string or file path, validates it against basic W3C rules, and saves it as YAML.

## Prerequisites
- Node.js installed.
- `js-yaml` available (bundled with storybook-addon-designbook).

## Implementation

```bash
#!/bin/bash
# Accept a YAML/JSON file path or inline JSON string
node .agent/skills/designbook-tokens/scripts/validate-and-save.cjs "$1" "$2"
```
