---
name: data-model-validate
description: Validates data-model.yml against the bundled JSON schema. Run after saving; fix loop until exit 0.
---

# Step: Validate Data Model

Run after writing `data-model.yml` to confirm it passes schema validation.

## Command

```bash
npx storybook-addon-designbook validate data-model
```

## Exit Codes

- `0` — file is valid
- `1` — validation errors found; output contains details

## Fix Loop

```
1. Run validate data-model
2. Read error output
3. Fix data-model.yml
4. Re-run until exit 0
```

## Common Errors

| Error | Fix |
|-------|-----|
| Missing `content` key | Wrap all entity types under `content:` |
| Unknown field type | Use one of: `string`, `text`, `integer`, `boolean`, `reference`, `image`, `file`, `datetime`, `email`, `url`, `decimal` |
| Missing `fields` in bundle | Every bundle needs a `fields:` map (even if empty) |
| `composition` invalid | Use `structured` or `unstructured` only |

## After This Step

Once exit code is 0, register the file and proceed with workflow tracking:

```bash
# Register file (in-progress)
Load @designbook-workflow/steps/add-files.md  → --files data-model.yml

# Mark done
Load @designbook-workflow/steps/update.md     → --status done
```
