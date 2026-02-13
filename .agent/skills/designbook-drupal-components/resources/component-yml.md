# Part 1: Generate .component.yml

> ⛔ **CRITICAL RULE**: Stories must **NEVER** be placed inside `.component.yml` (no `thirdPartySettings.sdcStorybook`). Stories are **always** a separate `.story.yml` file.

> ⛔ **NAMING RULE**: The filename must match the directory name. Component in `components/nav-main/` → file is `nav-main.component.yml`. Always kebab-case.

## Build Component YAML

Build the YAML structure with component metadata only — no stories, no thirdPartySettings:

**Base structure:**
```yaml
$schema: "https://git.drupalcode.org/project/drupal/-/raw/HEAD/core/assets/schemas/v1/metadata.schema.json"
name: [componentNameSnake]
status: [status]
description: [description]
provider: [provider]
```

**Add variants** (if provided):
```yaml
variants:
  [variant.id]:
    title: [variant.title]
    description: [variant.description]
```

**Add props** (if provided):
```yaml
props:
  type: object
  properties:
    [prop.name]:
      type: [prop.type]
      title: [prop.title]
      description: [prop.description]
      enum: [prop.enum]  # if provided
      default: [prop.default]  # if provided
  required: [[list of required prop names]]  # if any props are required
```

**Add slots** (if provided):
```yaml
slots:
  [slot.name]:
    title: [slot.title]
    description: [slot.description]
```

**Write to file:**
```
$DESIGNBOOK_DRUPAL_THEME/components/[componentNameKebab]/[componentNameKebab].component.yml
```

## Validate Against Schema

Validate the generated YAML file against the Drupal SDC metadata JSON schema using `ajv-cli`.

> ⚠️ The Drupal SDC schema uses **JSON Schema Draft-04**. Use `ajv-cli@3` + `ajv@6` (see `designbook-skills` for details).

The schema is bundled at `.agent/skills/designbook-drupal-components/metadata.schema.json`.

**Convert YAML to JSON for validation:**
```bash
node -e "
const fs = require('fs');
const yaml = require('yaml');
const content = fs.readFileSync('$DESIGNBOOK_DRUPAL_THEME/components/[componentNameKebab]/[componentNameKebab].component.yml', 'utf8');
const parsed = yaml.parse(content);
fs.writeFileSync('/tmp/component-validate.json', JSON.stringify(parsed, null, 2));
"
```

**Run validation:**
```bash
npx ajv-cli validate -s .agent/skills/designbook-drupal-components/metadata.schema.json -d /tmp/component-validate.json
```

**If validation fails:**
> "❌ Schema validation failed. Fix the errors above and re-run."

Review the validation errors, fix the generated `.component.yml`, and re-validate before continuing.

**If validation passes:**
> "✅ Component YAML validated against Drupal SDC schema."

## Rules

### Props Type Mapping
- `string` → `type: string`
- `boolean` → `type: boolean`
- `number` → `type: number` or `type: integer`
- `array` → `type: array`
- `object` → `type: object`

### Props with Enums
```yaml
variant:
  type: string
  enum:
    - default
    - outline
    - ghost
```

### Required Props
```yaml
props:
  type: object
  properties:
    # ... properties
  required:
    - propName1
    - propName2
```

### Empty Collections
If `variants`, `props`, or `slots` are empty, omit them from the YAML entirely.
