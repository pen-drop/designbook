---
name: sample-data-validate
description: Validates a section's data.yml against the data-model. Run after saving; fix loop until exit 0.
---

# Step: Validate Sample Data

Run after writing `data.yml` to confirm it passes validation against `data-model.yml`.

## Command

```bash
npx storybook-addon-designbook validate data [section-id]
```

Replace `[section-id]` with the section identifier (e.g. `home`, `blog`).

## Exit Codes

- `0` — file is valid
- `1` — validation errors found; output contains details

## Fix Loop

```
1. Run validate data [section-id]
2. Read error output
3. Fix sections/[section-id]/data.yml
4. Re-run until exit 0
```

## Common Errors

| Error | Fix |
|-------|-----|
| Entity type does not exist | Top-level key must match an entity type in `data-model.yml` |
| Bundle not defined | Second-level key must match a bundle in `data-model.yml` |
| Unknown field | Field not in `data-model.yml` — remove or add to data model |
| Required field missing | Add the missing required field to the record |
| Reference not found | Reference field value must match an `id` in the target entity's records |

## After This Step

Once exit code is 0, register the file and proceed with workflow tracking:

```bash
# Register file (in-progress)
Load @designbook-workflow/steps/add-files.md  → --files sections/[section-id]/data.yml

# Mark done
Load @designbook-workflow/steps/update.md     → --status done
```
