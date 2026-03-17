---
name: component-validate
description: Validates a component's .component.yml against the Drupal SDC schema. Run after writing each component; fix loop until exit 0.
---

# Step: Validate Component

Run after writing `.component.yml` to confirm it passes Drupal SDC schema validation.

## Command

```bash
npx storybook-addon-designbook validate component [name]
```

Replace `[name]` with the kebab-case component name (e.g. `button`, `card`).

## Exit Codes

- `0` — file is valid
- `1` — validation errors found; output contains details

## Fix Loop

```
1. Run validate component [name]
2. Read error output
3. Fix [name].component.yml
4. Re-run until exit 0
```

## Common Errors

| Error | Fix |
|-------|-----|
| Missing `$schema` | Add the Drupal SDC metadata schema URL |
| Missing `name` | Add `name:` matching the component directory name |
| Invalid prop type | Use one of: `string`, `boolean`, `integer`, `number`, `array`, `object` |
| Missing `title` on prop | Every prop needs a `title:` |
| Unexpected field | Remove unsupported fields |

## After This Step

Once exit code is 0, register the file and proceed with workflow tracking:

```bash
# Register file (in-progress)
Load @designbook-workflow/steps/add-files.md  → --files ../components/[name]/[name].component.yml

# Mark done
Load @designbook-workflow/steps/update.md     → --status done
```
