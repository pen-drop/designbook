---
description: Validate data model against schema and save to designbook/data-model.json
---

# Process Data Model

Validates data model input against the bundled JSON Schema using `ajv-cli` and saves it.

## Input

- A file path to a JSON file containing the data model, OR
- A JSON string (will be written to a temp file first)

## Steps

1. **Validate** the data model against the schema:

```bash
npx ajv-cli validate \
  -s .agent/skills/designbook-data-model/schema/data-model.json \
  -d <input-file>
```

2. **Save** — if validation passes, copy the validated file to the target:

```bash
DIST="${DESIGNBOOK_DIST:-designbook}"
mkdir -p "$DIST"
cp <input-file> "$DIST/data-model.json"
```

## Exit Codes

- `0` — validation passed, file saved
- `1` — validation failed, errors printed to stderr
