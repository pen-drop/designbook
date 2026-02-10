---
description: Process tokens input (string or file path) and save to designbook/design-tokens.json
---
This step receives a JSON string or file path, validates it against basic W3C rules, and saves it.

## Prerequisites
- Node.js installed.

## Implementation

```bash
#!/bin/bash
# Accept --tokens-json or --tokens-file
TOKENS_JSON="$1"
TOKENS_FILE="$2"

node ../scripts/validate-and-save.js "$TOKENS_JSON" "$TOKENS_FILE"
```
