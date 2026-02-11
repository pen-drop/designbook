---
name: Designbook Drupal Components
description: Creates Drupal SDC component files (.component.yml, .story.yml, and .twig) from structured component definition. Load this skill when DESIGNBOOK_TECHNOLOGY is drupal.
---

# Designbook Drupal Components

This skill generates Drupal Single Directory Component (SDC) files from a structured component definition. It creates three files per component, each documented in its own reference file:

| File | Reference | Description |
|------|-----------|-------------|
| `.component.yml` | [`resources/component-yml.md`](resources/component-yml.md) | SDC metadata (props, slots, variants) |
| `.story.yml` | [`resources/story-yml.md`](resources/story-yml.md) | SDC Storybook stories |
| `.twig` | [`resources/twig.md`](resources/twig.md) | Twig template |

> ⛔ **CRITICAL RULE**: Stories must **NEVER** be placed inside `.component.yml`. Stories are **always** a separate `.story.yml` file.

## Prerequisites

1. This skill is **technology-specific** and should only be used when `DESIGNBOOK_TECHNOLOGY` is set to `drupal` in `designbook.config.yml`.
2. Load the configuration using the `designbook-configuration` skill to check the technology value before invoking this skill.
3. `DESIGNBOOK_DRUPAL_THEME` must be set (via `drupal.theme` in `designbook.config.yml`). All component files are written to `DESIGNBOOK_DRUPAL_THEME/components/[component-name]/`.

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
  ],
  "stories": [
    {
      "id": "preview",
      "title": "Preview",
      "props": { "variant": "default" },
      "slots": {
        "text": [
          { "type": "element", "value": "Click me" }
        ]
      }
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
- `stories` (array, defaults to empty)

## Output Structure

```
$DESIGNBOOK_DRUPAL_THEME/components/
└── [component-name]/
    ├── [component-name].component.yml  # SDC metadata
    ├── [component-name].story.yml      # SDC Storybook stories
    └── [component-name].twig           # Twig template
```

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

Derive two name formats:

**Kebab-case** — for file system (directories and file names):
- "Button" → "button"
- "HeroSection" → "hero-section"
- "CardWithImage" → "card-with-image"

Store as `componentNameKebab`.

**Snake_case** — for the `name:` field inside `.component.yml`:
- "Button" → "button"
- "HeroSection" → "hero_section"
- "CardWithImage" → "card_with_image"

Store as `componentNameSnake`.

### Step 3: Check for Existing Component

Check if the component directory already exists:

```bash
ls $DESIGNBOOK_DRUPAL_THEME/components/[componentNameKebab]/
```

**If exists:**
> "⚠️  Component `[name]` already exists at `$DESIGNBOOK_DRUPAL_THEME/components/[componentNameKebab]/`
>
> Do you want to **overwrite** it? (y/n)"

Wait for confirmation. If "n", stop execution.

### Step 4: Create Component Directory

```bash
mkdir -p $DESIGNBOOK_DRUPAL_THEME/components/[componentNameKebab]
```

### Step 5: Generate .component.yml

→ Follow instructions in [`resources/component-yml.md`](resources/component-yml.md)

### Step 6: Generate .story.yml

→ Follow instructions in [`resources/story-yml.md`](resources/story-yml.md)

### Step 7: Generate .twig

→ Follow instructions in [`resources/twig.md`](resources/twig.md)

### Step 8: Verify Output

Check that all three files were created successfully:

```bash
ls -la $DESIGNBOOK_DRUPAL_THEME/components/[componentNameKebab]/
```

Expected files:
- `[componentNameKebab].component.yml`
- `[componentNameKebab].story.yml`
- `[componentNameKebab].twig`

**If successful:**
> "✅ **Component created successfully!**
>
> **Files:**
> - `$DESIGNBOOK_DRUPAL_THEME/components/[componentNameKebab]/[componentNameKebab].component.yml`
> - `$DESIGNBOOK_DRUPAL_THEME/components/[componentNameKebab]/[componentNameKebab].story.yml`
> - `$DESIGNBOOK_DRUPAL_THEME/components/[componentNameKebab]/[componentNameKebab].twig`
>
> **Component details:**
> - Name: [name]
> - Status: [status]
> - Variants: [count]
> - Props: [count]
> - Slots: [count]
> - Stories: [count]"

**If failed:**
> "❌ Failed to create component files. Check the error above."

## Error Handling

- **Missing required parameter**: Report which parameter is missing
- **Invalid status value**: List valid options (`stable`, `experimental`, `deprecated`)
- **Component already exists**: Ask for confirmation before overwriting
- **Directory creation fails**: Report filesystem error
- **File write fails**: Report which file failed and why
- **Schema validation fails**: Show errors and fix before continuing

## Design Principles

1. **Three files, three concerns**: Metadata, stories, and template are always separate
2. **Idempotent**: Running multiple times with same input produces same result
3. **Validated**: Component YAML is validated against the Drupal SDC schema
4. **Safe**: Asks for confirmation before overwriting existing components
5. **Standard**: Follows Drupal SDC and SDC Storybook conventions
