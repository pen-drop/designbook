---
name: tokens-validate
description: Validates design-tokens.yml against the bundled JSON schema. Run after saving; fix loop until exit 0.
---

# Step: Validate Design Tokens

Run after writing `design-tokens.yml` to confirm it passes schema validation.

## Command

```bash
npx storybook-addon-designbook validate tokens
```

## Exit Codes

- `0` — file is valid
- `1` — validation errors found; output contains details

## Fix Loop

```
1. Run validate tokens
2. Read error output
3. Fix design-tokens.yml
4. Re-run until exit 0
```

## Common Errors

| Error | Fix |
|-------|-----|
| Missing `$value` | Every token leaf MUST have a `$value` key |
| Missing `$type` | Every token leaf MUST have a `$type` key |
| Invalid `$type` | Use one of: `color`, `fontFamily`, `dimension`, `number`, `fontWeight`, `duration`, `cubicBezier`, `shadow`, `gradient`, `transition`, `border`, `strokeStyle`, `typography` |
| Not a valid object | Token input must be a YAML object with at least one top-level group |

## After This Step

Once exit code is 0, register the file and proceed with workflow tracking:

```bash
# Register file (in-progress)
Load @designbook-workflow/steps/add-files.md  → --files design-system/design-tokens.yml

# Mark done
Load @designbook-workflow/steps/update.md     → --status done
```
