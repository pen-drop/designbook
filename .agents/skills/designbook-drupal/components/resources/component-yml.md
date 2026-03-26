# Part 1: Generate .component.yml

> ⛔ **YAML QUOTING**: Always use double quotes (`"`) in all YAML files. Never use single quotes (`'`) — they cause parser errors in the SDC Storybook addon.

> ⛔ **CRITICAL RULE**: Stories must **NEVER** be placed inside `.component.yml`. Stories are **always** a separate `.story.yml` file. However, `thirdPartySettings.sdcStorybook.disableBasicStory: true` **must always** be included to prevent auto-generated basic stories.

> ⛔ **NAMING RULE**: The filename must match the directory name. Component in `components/nav-main/` → file is `nav-main.component.yml`. Always kebab-case.

## Build Component YAML

Build the YAML structure with component metadata — no inline stories, but always include `thirdPartySettings`:

**Base structure:**
```yaml
$schema: "https://git.drupalcode.org/project/drupal/-/raw/HEAD/core/assets/schemas/v1/metadata.schema.json"
name: [componentNameSnake]
status: [status]
group: [group]
description: [description]
provider: COMPONENT_NAMESPACE
thirdPartySettings:
  sdcStorybook:
    disableBasicStory: true
```

> ⚠️ The `thirdPartySettings.sdcStorybook.disableBasicStory: true` entry is **mandatory** for every component. It disables the auto-generated basic story since we always provide an explicit `.story.yml` file.

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
