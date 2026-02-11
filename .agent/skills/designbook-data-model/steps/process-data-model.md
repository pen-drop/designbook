---
description: Process data model input (string or file path) and save to designbook/data-model.json
---
This step receives a JSON string or file path, validates it against `schema/data-model.json`, and saves it.

## Prerequisites
- Node.js installed.

## Implementation

```bash
#!/bin/bash
# Accept --data-model-json or file path as first argument
DATA_MODEL_INPUT="$1"

node .agent/skills/designbook-data-model/scripts/validate-and-save.cjs "$DATA_MODEL_INPUT"
```
