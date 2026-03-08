---
name: Designbook Drupal Components
description: Creates Drupal SDC component files (.component.yml, .story.yml, and .twig) from structured component definition. Load this skill when DESIGNBOOK_FRAMEWORK_COMPONENT is sdc. Used when building UI components.
---

# Designbook Drupal Components — UI

> **Component Type: UI** — This skill generates **UI components**: the only component type that contains real HTML markup. UI components are the building blocks referenced by all other component types. CSS styling is handled separately by the CSS generation skill based on `designbook.config.yml`.

### Component Type Overview

| Type | Skill | Has Markup? | Location | Prefix | Provider |
|------|-------|-------------|----------|--------|----------|
| **UI** ← this skill | `designbook-components-sdc` | ✅ Yes — real HTML | `$DESIGNBOOK_DRUPAL_THEME/components/` | _(none)_ | Theme provider (e.g. `daisy_cms_daisyui`) |
| Entity | `designbook-components-entity-sdc` | ❌ No — structural wrapper | `$DESIGNBOOK_DIST/components/entity-*/` | `entity-` | `designbook_design` |
| Scenes | `designbook-scenes` | ❌ No — `*.scenes.yml` only | `$DESIGNBOOK_DIST/components/section-*/` | `section-` | `designbook_design` |

> [!CAUTION]
> **MANDATORY**: Before generating ANY components, you MUST read ALL resource files in `resources/`. Each contains critical rules that prevent common mistakes:
> - [`resources/layout-reference.md`](resources/layout-reference.md) — Layout component definitions. **Never create domain-specific grids.**
> - [`resources/shell-generation.md`](resources/shell-generation.md) — Shell generation workflow.
> - [`resources/component-yml.md`](resources/component-yml.md) — Component YAML structure.
> - [`resources/story-yml.md`](resources/story-yml.md) — Story YAML structure.
> - [`resources/twig.md`](resources/twig.md) — Twig template rules.
> - [`resources/rules.md`](resources/rules.md) — General conventions and error handling.

---

### UI Component Categories

All UI components use a `group:` key in `.component.yml` to organize them into categories in Storybook's sidebar.

| Category | `group:` value | Example Components |
|----------|---------------|-------------------|
| **Action** | `Action` | button, link |
| **Data Display** | `Data Display` | card, heading, text-block, figure, badge |
| **Navigation** | `Navigation` | navigation (variants: primary, footer), breadcrumb |
| **Layout** | `Layout` | layout, layout-columns (from daisy-cms reference) |
| **Shell** | `Shell` | header, footer, page |

> **Shell components** (header, footer, page) are regular UI components with real HTML markup. They live in `$DESIGNBOOK_DRUPAL_THEME/components/header/` alongside all other UI components and use the theme provider. They compose other UI components via slots (logo, navigation, user menu, etc.). See [Shell Components](#shell-components) for generation details.

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
> ├── nav-main.component.yml         ✅ correct
> ├── nav-main.default.story.yml     ✅ correct
> ├── nav-main.twig            ✅ correct

> └── nav-main.js              ✅ correct (optional)
> ```
>
> **Never** mix names:
> ```
> components/nav-main/
> ├── navigation.component.yml       ❌ WRONG — must be nav-main.component.yml
> ├── main-nav.story.yml             ❌ WRONG — must be nav-main.default.story.yml
> └── NavMain.twig             ❌ WRONG — must be nav-main.twig
> ```

## Prerequisites

1. This skill is **component-framework-specific** and should only be used when `DESIGNBOOK_FRAMEWORK_COMPONENT` is set to `sdc` in `designbook.config.yml`.
2. Load the configuration using the `designbook-configuration` skill to check the technology value before invoking this skill.
3. `DESIGNBOOK_DRUPAL_THEME` must be set (via `drupal.theme` in `designbook.config.yml`). UI component files are written to `$DESIGNBOOK_DRUPAL_THEME/components/[component-name]/` by default.

## Input Parameters

Expected as JSON object:

```json
{
  "name": "Button",
  "description": "A clickable button component",
  "group": "Action",
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
- `group` (string) — category for Storybook sidebar grouping (e.g., `Action`, `Data Display`, `Navigation`, `Layout`, `Shell`)
- `status` (string)
- `provider` (string, typically "daisy_cms_daisyui")

**Optional fields:**
- `variants` (array, defaults to empty)
- `props` (array, defaults to empty)
- `slots` (array, defaults to empty)
- `stories` (array, defaults to empty)
- `outputDir` (string, defaults to `$DESIGNBOOK_DRUPAL_THEME/components/[component-name]`). When provided, files are written to this directory instead of the default. Used by design skills (`designbook-entity`, `designbook-scenes`) to write designbook components to `$DESIGNBOOK_DIST/components/`.

## Output Structure

All files use the **same base name** as the directory (kebab-case):

**UI Components (default):**
```
$DESIGNBOOK_DRUPAL_THEME/components/
└── [component-name]/
    ├── [component-name].component.yml         # SDC metadata (required)
    ├── [component-name].default.story.yml      # SDC Storybook story (required, use "default" name)
    └── [component-name].twig                   # Twig template (required)
```

**Designbook Components (via `outputDir`):**
```
$DESIGNBOOK_DIST/components/
└── [component-name]/
    ├── [component-name].component.yml
    ├── [component-name].default.story.yml
    └── [component-name].twig
```

When `outputDir` is provided, output goes to the specified directory instead:

```
[outputDir]/
├── [component-name].component.yml
├── [component-name].default.story.yml
└── [component-name].twig
```

> **Rule:** Directory name = file base name. Always. `button/button.*`, `nav-main/nav-main.*`, `hero-section/hero-section.*`.

## Execution Steps

### Step 1: Validate Input

Check that all required parameters are provided:
- `name` is a valid string (alphanumeric, hyphens, underscores)
- `description` is not empty
- `group` is one of: `Action`, `Data Display`, `Navigation`, `Layout`, `Shell`
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
- `[componentNameKebab].[storyName].story.yml` (required — use `default` for single stories)
- `[componentNameKebab].twig` (required)

**If successful:**
> "✅ **Component created successfully!**
>
> **Files:**
> - `[targetDir]/[componentNameKebab].component.yml`
> - `[targetDir]/[componentNameKebab].[storyName].story.yml`
> - `[targetDir]/[componentNameKebab].twig`
>
> **Component details:**
> - Name: [name]
> - Group: [group]
> - Status: [status]
> - Variants: [count]
> - Props: [count]
> - Slots: [count]
> - Stories: [count]"

**If failed:**
> "❌ Failed to create component files. Check the error above."

### Step 9: Validate Component

Automatically validate the component in Storybook.

Invocation:
```json
{
  "skill": "designbook-component-validate",
  "args": {
    "component_name": "[componentNameKebab]",
    "group": "[group]",
    "component_path": "[targetDir]",
    "stories": [List of story names from input or ["default"]]
  }
}
```

---

## Variants Instead of Duplicate Components

> ⛔ **CRITICAL RULE — One Component, Multiple Variants**: When two potential components share **essentially the same props and slots** (i.e. the same SDC structure) but differ in **layout or visual arrangement**, they **must** be implemented as **variants of a single component** — never as separate components.

### When to Use Variants

| Scenario | Approach |
|----------|----------|
| Same props + same slots, different layout | ✅ **Single component with variants** |
| Different props or different slots | ❌ Separate components |
| Same structure, minor styling difference (e.g. color) | ✅ Variant with modifier class |
| Same structure, fundamentally different HTML | ✅ Variant with separate Twig include |

**Example**: A `card` component may appear as a vertical card and a horizontal card. Both accept the same props (`title`, `description`) and the same slots (`media`, `actions`). → This is **one `card` component** with variants `vertical` and `horizontal`.

### Implementation Pattern: Twig Includes per Variant

When the layout between variants is significantly different, use a **Twig include for each variant**. The main template dispatches to the correct include based on the `variant` prop.

**Directory structure:**
```
components/card/
├── card.component.yml       # Single component definition with variants
├── card.vertical.story.yml  # Story for vertical variant
├── card.horizontal.story.yml # Story for horizontal variant
├── card.twig                # Main template — dispatches to includes
├── card--vertical.twig      # Layout for vertical variant
├── card--horizontal.twig    # Layout for horizontal variant

```

> [!WARNING]
> **SDC addon twig import rule**: The `storybook-addon-sdc` imports ALL `.twig` files in a component directory as `import COMPONENT from '...'`. When multiple `.twig` files exist (variant includes), this causes a `SyntaxError: Identifier 'COMPONENT' has already been declared`. The `sdc-dedup-component-import` Vite plugin in `.storybook/main.js` fixes this by keeping only the **first** `COMPONENT` import and converting duplicates to side-effect imports.
>
> **Rule**: The **main** `.twig` file (the one the SDC addon imports as `COMPONENT`) must match the directory name: `card/card.twig`. Variant includes (e.g., `card--vertical.twig`) are loaded as side-effect imports for HMR only.

**Main template (`card.twig`) — variant dispatcher:**
```twig
{#
/**
 * @file
 * Template for card component.
 *
 * Dispatches to variant-specific includes via static if/elseif.
 * (Dynamic includes are NOT used because they don't work in Storybook.)
 */
#}
{% set variant = variant|default('vertical') %}

{% if variant == 'horizontal' %}
  {% include 'card--horizontal.twig' with {
    attributes: attributes,
    title: title,
    description: description,
    media: media,
    actions: actions,
  } only %}
{% else %}
  {% include 'card--vertical.twig' with {
    attributes: attributes,
    title: title,
    description: description,
    media: media,
    actions: actions,
  } only %}
{% endif %}
```

> ⚠️ **No dynamic includes**: Always use `{% if variant == '...' %}{% include '...' %}{% endif %}` with **static string paths**. Dynamic expressions like `{% include name ~ '.twig' %}` are **not supported** in Storybook's SDC addon.

**Variant include (`card--vertical.twig`):**
```twig
{% set classes = [
  'component',
  'card',
  'card--vertical',
] %}

<div{{ attributes.addClass(classes) }}>
  {% if media %}
    <div class="card__media">{{ media }}</div>
  {% endif %}
  <div class="card__body">
    {% if title %}<h3 class="card__title">{{ title }}</h3>{% endif %}
    {% if description %}<p class="card__description">{{ description }}</p>{% endif %}
  </div>
  {% if actions %}
    <div class="card__actions">{{ actions }}</div>
  {% endif %}
</div>
```

**Variant include (`card--horizontal.twig`):**
```twig
{% set classes = [
  'component',
  'card',
  'card--horizontal',
] %}

<div{{ attributes.addClass(classes) }}>
  <div class="card__row">
    {% if media %}
      <div class="card__media">{{ media }}</div>
    {% endif %}
    <div class="card__content">
      {% if title %}<h3 class="card__title">{{ title }}</h3>{% endif %}
      {% if description %}<p class="card__description">{{ description }}</p>{% endif %}
      {% if actions %}
        <div class="card__actions">{{ actions }}</div>
      {% endif %}
    </div>
  </div>
</div>
```

> **Naming convention for variant includes**: Always use `[component-name]--[variant-id].twig`. These files live in the same component directory and are **not** standalone SDC components — they are internal Twig partials.

### Stories for Variant Components

Each variant gets its **own story file** — one file per story:

```yaml
# card.vertical.story.yml
name: vertical
props:
  variant: vertical
  title: 'Example Title'
  description: 'Example description text.'
slots:
  media:
    - type: component
      component: 'provider:figure'
      props:
        src: 'https://picsum.photos/400/300'
```

```yaml
# card.horizontal.story.yml
name: horizontal
props:
  variant: horizontal
  title: 'Example Title'
  description: 'Example description text.'
    slots:
      media:
        - type: component
          component: 'provider:figure'
          props:
            src: 'https://picsum.photos/300/200'
```

---

## Shell Components

Shell components (header, footer, page) are UI components in the `Shell` category with a special generation workflow.

→ Follow the complete shell generation workflow in [`resources/shell-generation.md`](resources/shell-generation.md)

---

## Layout Components

> [!CAUTION]
> **MUST READ** [`resources/layout-reference.md`](resources/layout-reference.md) before generating any layout or grid component.

Layout components (`layout`, `layout_columns`) provide the grid system. **Never create domain-specific layout components** (e.g. `article-grid`, `blog-grid`, `card-grid`) — always use the generic `layout` component with appropriate grid classes like `grid-3` for a 3-column layout.

> [!IMPORTANT]
> **Use `layout` everywhere you need max-width and horizontal padding (padding-x).** The `layout` component (with `container-md` or similar container classes) is the **single source** for constraining content width and adding horizontal padding to keep content away from the browser edges. No other component should set its own `max-width` or horizontal browser padding — always wrap in a `layout` instead.

→ Full component definitions, Twig templates, and story examples in [`resources/layout-reference.md`](resources/layout-reference.md)

---

## Rules, Principles, and Error Handling

→ See [`resources/rules.md`](resources/rules.md) for all conventions.

Key principles: kebab-case naming, variants over duplication, three files per component, generic naming (no business logic), placeholder images (`https://placehold.co/`) only, `group:` key on every component.

