---
name: Designbook Drupal Components
description: Creates Drupal SDC component files (.component.yml and .twig) from structured component definition.
---

# Designbook Drupal Components

This skill generates Drupal Single Directory Component (SDC) files from a structured component definition. It creates both the YAML configuration and the Twig template files.

## Capability

### Create Component
**Trigger**: When called with a component definition (typically from `/debo-design-component` workflow).

**Action**: Generate component files in the standard Drupal SDC structure.

## Input Parameters

Expected as JSON object:

```json
{
  "name": "Button",
  "description": "A clickable button component",
  "status": "stable|experimental|deprecated",
  "provider": "daisy_cms_daisyui",
  "variants": [
    {
      "id": "default",
      "title": "Default",
      "description": "Default button style"
    }
  ],
  "props": [
    {
      "name": "variant",
      "type": "string",
      "title": "Visual Variant",
      "description": "Choose button style",
      "enum": ["default", "outline"],
      "default": "default",
      "required": false
    }
  ],
  "slots": [
    {
      "name": "text",
      "title": "Button Text",
      "description": "The clickable label"
    }
  ]
}
```

**Required fields:**
- `name` (string)
- `description` (string)
- `status` (string)
- `provider` (string, typically "daisy_cms_daisyui")

**Optional fields:**
- `variants` (array, defaults to empty)
- `props` (array, defaults to empty)
- `slots` (array, defaults to empty)

## Execution Steps

### Step 1: Validate Input

Check that all required parameters are provided:
- `name` is a valid string (alphanumeric, hyphens, underscores)
- `description` is not empty
- `status` is one of: `stable`, `experimental`, `deprecated`
- `provider` is specified

**Error Handling:**
If validation fails, report the error and stop:
> "❌ Invalid component definition: [specific error]"

### Step 2: Normalize Component Name

Convert the component name to lowercase-kebab-case for file system:
- "Button" → "button"
- "HeroSection" → "hero-section"
- "CardWithImage" → "card-with-image"

Store as `componentNameKebab`.

### Step 3: Check for Existing Component

Check if the component directory already exists:

```bash
ls components/[componentNameKebab]/
```

**If exists:**
> "⚠️  Component `[name]` already exists at `components/[componentNameKebab]/`
>
> Do you want to **overwrite** it? (y/n)"

Wait for confirmation. If "n", stop execution.

### Step 4: Create Component Directory

```bash
mkdir -p components/[componentNameKebab]
```

### Step 5: Generate .component.yml

Build the YAML structure:

**Base structure:**
```yaml
$schema: "https://git.drupalcode.org/project/drupal/-/raw/HEAD/core/assets/schemas/v1/metadata.schema.json"
name: [name]
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
components/[componentNameKebab]/[componentNameKebab].component.yml
```

### Step 6: Generate .twig Template

Create a basic Twig template with helpful structure:

**Template content:**
```twig
{#
/**
 * @file
 * Template for [name] component.
 *
 * Available variables:
[For each prop:]
 * - [prop.name]: [prop.description]
[For each slot:]
 * - [slot.name]: [slot.description]
 */
#}
{% set classes = [
  'component',
  '[componentNameKebab]',
  variant ? '[componentNameKebab]--' ~ variant : '[componentNameKebab]--default',
] %}

<div{{ attributes.addClass(classes) }}>
[For each slot:]
  {% if [slot.name] %}
    <div class="[componentNameKebab]__[slot.name]">
      {{ [slot.name] }}
    </div>
  {% endif %}
[End for]
</div>
```

**Write to file:**
```
components/[componentNameKebab]/[componentNameKebab].twig
```

### Step 7: Verify Output

Check that both files were created successfully:

```bash
ls -la components/[componentNameKebab]/
```

Expected files:
- `[componentNameKebab].component.yml`
- `[componentNameKebab].twig`

**If successful:**
> "✅ **Component created successfully!**
>
> **Files:**
> - `components/[componentNameKebab]/[componentNameKebab].component.yml`
> - `components/[componentNameKebab]/[componentNameKebab].twig`
>
> **Component details:**
> - Name: [name]
> - Status: [status]
> - Variants: [count]
> - Props: [count]
> - Slots: [count]"

**If failed:**
> "❌ Failed to create component files. Check the error above."

## Output Structure

```
components/
└── [component-name]/
    ├── [component-name].component.yml  # Drupal SDC configuration
    └── [component-name].twig           # Twig template
```

## YAML Generation Rules

### Props Type Mapping
- `string` → `type: string`
- `boolean` → `type: boolean`
- `number` → `type: number` or `type: integer`
- `array` → `type: array`
- `object` → `type: object`

### Props with Enums
If a prop has `enum` values, add the `enum` field:
```yaml
variant:
  type: string
  enum:
    - default
    - outline
    - ghost
```

### Required Props
If any props have `required: true`, add a `required` array at the props level:
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
If `variants`, `props`, or `slots` are empty, omit them from the YAML (don't include empty objects).

## Twig Generation Rules

### Class Structure
Always include base BEM-style classes:
```twig
{% set classes = [
  'component',
  '[component-name]',
  variant ? '[component-name]--' ~ variant : '[component-name]--default',
] %}
```

### Slot Rendering
For each slot, create a conditional wrapper:
```twig
{% if slot_name %}
  <div class="[component-name]__[slot-name]">
    {{ slot_name }}
  </div>
{% endif %}
```

### Comments
Include a Drupal-style file docblock with available variables.

## Error Handling

- **Missing required parameter**: Report which parameter is missing
- **Invalid status value**: List valid options (`stable`, `experimental`, `deprecated`)
- **Component already exists**: Ask for confirmation before overwriting
- **Directory creation fails**: Report filesystem error
- **File write fails**: Report which file failed and why

## Usage Example

Called from `/debo-design-component` workflow:

```bash
# User runs workflow
/debo-design-component

# Workflow gathers data, then calls this skill:
Execute: .agent/skills/designbook-drupal-components/SKILL.md
With parameters: {
  "name": "Button",
  "description": "A clickable button",
  "status": "experimental",
  "provider": "daisy_cms_daisyui",
  "variants": [{"id": "default", "title": "Default", "description": "..."}],
  "props": [{"name": "variant", "type": "string", ...}],
  "slots": [{"name": "text", "title": "Button Text", ...}]
}
```

Result:
```
components/button/
├── button.component.yml
└── button.twig
```

## Integration

This skill is designed to work with:
- **Input**: `/debo-design-component` workflow (conversational data gathering)
- **Output**: Drupal SDC component files ready for Storybook
- **Next Steps**: User can add CSS, create stories, or integrate with Figma workflows

## Design Principles

1. **Idempotent**: Running multiple times with same input produces same result
2. **Validated**: All inputs are checked before file generation
3. **Safe**: Asks for confirmation before overwriting existing components
4. **Helpful**: Generates complete, well-structured boilerplate code
5. **Standard**: Follows Drupal SDC conventions and best practices
