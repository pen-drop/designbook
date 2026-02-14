---
name: Designbook Drupal Components
description: Creates Drupal SDC component files (.component.yml, .story.yml, and .twig) from structured component definition. Load this skill when DESIGNBOOK_TECHNOLOGY is drupal. Used when building UI components.
---

# Designbook Drupal Components — UI

> **Component Type: UI** — This skill generates **UI components**: the only component type that contains real HTML markup and visual styling (e.g. DaisyUI classes). UI components are the building blocks referenced by all other component types.

### Component Type Overview

| Type | Skill | Has Markup? | Location | Prefix | Provider |
|------|-------|-------------|----------|--------|----------|
| **UI** ← this skill | `designbook-drupal-components-ui` | ✅ Yes — real HTML + CSS | `$DESIGNBOOK_DRUPAL_THEME/components/` | _(none)_ | Theme provider (e.g. `daisy_cms_daisyui`) |
| Shell | `designbook-drupal-components-shell` | ❌ No — slots only | `$DESIGNBOOK_DIST/components/shell-*/` | `shell-` | `designbook_design` |
| Entity | `designbook-drupal-components-entity` | ❌ No — structural wrapper | `$DESIGNBOOK_DIST/components/entity-*/` | `entity-` | `designbook_design` |
| Screen | `designbook-drupal-components-screen` | ❌ No — slots only | `$DESIGNBOOK_DIST/components/section-*/` | `section-` | `designbook_design` |

---

This skill generates Drupal Single Directory Component (SDC) files from a structured component definition. It creates three files per component, each documented in its own reference file:

| File | Reference | Description |
|------|-----------|-------------|
| `.component.yml` | [`resources/component-yml.md`](resources/component-yml.md) | SDC metadata (props, slots, variants) |
| `.story.yml` | [`resources/story-yml.md`](resources/story-yml.md) | SDC Storybook stories |
| `.twig` | [`resources/twig.md`](resources/twig.md) | Twig template |

> ⛔ **CRITICAL RULE**: Stories must **NEVER** be placed inside `.component.yml`. Stories are **always** a separate `.story.yml` file.

> ⛔ **NAMING CONVENTION**: All files in a component directory **must share the same base name** as the directory. The base name is always **kebab-case**. No exceptions.
>
> ```
> components/nav-main/
> ├── nav-main.component.yml   ✅ correct
> ├── nav-main.story.yml       ✅ correct
> ├── nav-main.twig            ✅ correct
> ├── nav-main.css             ✅ correct (optional)
> └── nav-main.js              ✅ correct (optional)
> ```
>
> **Never** mix names:
> ```
> components/nav-main/
> ├── navigation.component.yml ❌ WRONG — must be nav-main.component.yml
> ├── main-nav.story.yml       ❌ WRONG — must be nav-main.story.yml
> └── NavMain.twig             ❌ WRONG — must be nav-main.twig
> ```

## Prerequisites

1. This skill is **technology-specific** and should only be used when `DESIGNBOOK_TECHNOLOGY` is set to `drupal` in `designbook.config.yml`.
2. Load the configuration using the `designbook-configuration` skill to check the technology value before invoking this skill.
3. `DESIGNBOOK_DRUPAL_THEME` must be set (via `drupal.theme` in `designbook.config.yml`). UI component files are written to `$DESIGNBOOK_DRUPAL_THEME/components/[component-name]/` by default.

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
  "thirdPartySettings": {
    "sdcStorybook": {
      "disableBasicStory": true
    }
  }  
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
- `outputDir` (string, defaults to `$DESIGNBOOK_DRUPAL_THEME/components/[component-name]`). When provided, files are written to this directory instead of the default. Used by design skills (`designbook-shell`, `designbook-entity`, `designbook-screen`) to write designbook components to `$DESIGNBOOK_DIST/components/`.

## Output Structure

All files use the **same base name** as the directory (kebab-case):

**UI Components (default):**
```
$DESIGNBOOK_DRUPAL_THEME/components/
└── [component-name]/
    ├── [component-name].component.yml  # SDC metadata (required)
    ├── [component-name].story.yml      # SDC Storybook stories (required)
    ├── [component-name].twig           # Twig template (required)
    ├── [component-name].css            # Component styles (optional)
    └── [component-name].js             # Component behavior (optional)
```

**Designbook Components (via `outputDir`):**
```
$DESIGNBOOK_DIST/components/
└── [component-name]/
    ├── [component-name].component.yml
    ├── [component-name].story.yml
    └── [component-name].twig
```

When `outputDir` is provided, output goes to the specified directory instead:

```
[outputDir]/
├── [component-name].component.yml
├── [component-name].story.yml
├── [component-name].twig
├── [component-name].css               # optional
└── [component-name].js                # optional
```

> **Rule:** Directory name = file base name. Always. `button/button.*`, `nav-main/nav-main.*`, `hero-section/hero-section.*`.

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

### Step 3: Determine Output Directory

Resolve the output directory:

```
if outputDir is provided:
  targetDir = outputDir
else:
  targetDir = $DESIGNBOOK_DRUPAL_THEME/components/[componentNameKebab]
```

Check if the target directory already has files:

```bash
ls [targetDir]/
```

**If exists:**
> "⚠️  Component `[name]` already exists at `[targetDir]/`
>
> Do you want to **overwrite** it? (y/n)"

Wait for confirmation. If "n", stop execution.

### Step 4: Create Component Directory

```bash
mkdir -p [targetDir]
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
ls -la [targetDir]/
```

Expected files (all sharing the same base name as the directory):
- `[componentNameKebab].component.yml` (required)
- `[componentNameKebab].story.yml` (required)
- `[componentNameKebab].twig` (required)
- `[componentNameKebab].css` (optional, if component has custom styles)
- `[componentNameKebab].js` (optional, if component has behavior)

**If successful:**
> "✅ **Component created successfully!**
>
> **Files:**
> - `[targetDir]/[componentNameKebab].component.yml`
> - `[targetDir]/[componentNameKebab].story.yml`
> - `[targetDir]/[componentNameKebab].twig`
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

1. **Consistent naming**: Directory name = file base name. Always kebab-case. `button/button.*`, `nav-main/nav-main.*`
2. **Three files minimum, one concern each**: Metadata (`.component.yml`), stories (`.story.yml`), and template (`.twig`) are always separate. Optional `.css` and `.js` follow the same naming pattern
3. **Idempotent**: Running multiple times with same input produces same result
4. **Validated**: Component YAML is validated against the Drupal SDC schema
5. **Safe**: Asks for confirmation before overwriting existing components
6. **Standard**: Follows Drupal SDC and SDC Storybook conventions
