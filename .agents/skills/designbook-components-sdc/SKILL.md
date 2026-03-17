---
name: Designbook Drupal Components
description: Creates Drupal SDC component files (.component.yml, .story.yml, and .twig) from structured component definition. Load this skill when DESIGNBOOK_FRAMEWORK_COMPONENT is sdc. Used when building UI components.
---

# Designbook Drupal Components — UI

> **Component Type: UI** — This skill generates **UI components**: the only component type that contains real HTML markup. UI components are the building blocks referenced by all other component types. CSS styling is handled separately by the CSS generation skill based on `designbook.config.yml`.

### Component Type Overview

| Type | Skill | Has Markup? | Location | Prefix | Provider |
|------|-------|-------------|----------|--------|----------|
| **UI** ← this skill | `designbook-components-sdc` | ✅ Yes — real HTML | `$DESIGNBOOK_DRUPAL_THEME/components/` | _(none)_ | Theme provider (e.g. `test_integration_drupal`) |
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
> - [`resources/component-patterns.md`](resources/component-patterns.md) — Slot/variant/prop detection heuristics and parsing examples.

---

### UI Component Categories

All UI components use a `group:` key in `.component.yml` to organize them into categories in Storybook's sidebar.

| Category | `group:` value | Example Components |
|----------|---------------|-------------------|
| **Action** | `Action` | button, link |
| **Data Display** | `Data Display` | card, heading, text-block, figure, badge |
| **Navigation** | `Navigation` | navigation (variants: primary, footer), breadcrumb |
| **Layout** | `Layout` | container, grid, section |
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

> ⛔ **FILE GENERATION ORDER — Phase-Based with Per-Component Validation**: When generating multiple components, use three phases: **Phase 1: ALL Twig → Phase 2: ALL Stories → Phase 3: Each Component YAML + Validate**. Read the relevant resource once at the start of each phase. CSS skill (`@designbook-css-$DESIGNBOOK_FRAMEWORK_CSS/SKILL.md`) is only needed in Phase 1 (Twig). In Phase 3, validate each component immediately after writing its `.component.yml` before proceeding to the next.

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
  "provider": "test_integration_drupal",
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
- `provider` (string, typically "test_integration_drupal")

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

### Step 5: Phase 1 — Generate ALL .twig files

> ⛔ **Read these resources NOW** (once, before any Twig file):
> 1. [`resources/twig.md`](resources/twig.md) — template structure and rules
> 2. `@designbook-css-$DESIGNBOOK_FRAMEWORK_CSS/SKILL.md` — CSS classes to use (only needed in this phase)

Generate `.twig` for ALL components. No `.story.yml` or `.component.yml` files yet.

→ Follow instructions in [`resources/twig.md`](resources/twig.md)

### Step 6: Phase 2 — Generate ALL .story.yml files

> ⛔ **Read [`resources/story-yml.md`](resources/story-yml.md) NOW** (once, before any story file).

Generate `.story.yml` for ALL components. No `.component.yml` files yet.

→ Follow instructions in [`resources/story-yml.md`](resources/story-yml.md)

### Step 7: Phase 3 — Generate .component.yml + Validate (per component)

> ⛔ **Read [`resources/component-yml.md`](resources/component-yml.md) NOW** (once, before any component YAML).

For each component: write `.component.yml`, then immediately validate before proceeding to the next.

Load `@designbook-components-sdc/steps/validate.md` → fix loop until exit 0 before proceeding to the next component.

→ Follow instructions in [`resources/component-yml.md`](resources/component-yml.md)

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

### Step 9: Update workflow + validate

> ⛔ **Use `@designbook-workflow/steps/`** for tracking: load `create` → `update` (in-progress) → `add-files` → `validate` → `update` (done).

Produced files for `--files`:
- `../components/[componentNameKebab]/[componentNameKebab].component.yml`
- `../components/[componentNameKebab]/[componentNameKebab].default.story.yml`

---

## Variants Instead of Duplicate Components

> ⛔ **CRITICAL RULE — One Component, Multiple Variants**: When two potential components share **essentially the same props and slots** (i.e. the same SDC structure) but differ in **layout or visual arrangement**, they **must** be implemented as **variants of a single component** — never as separate components.

### When to Use Variants

| Scenario | Approach |
|----------|----------|
| Same props + same slots, different layout | ✅ **Single component with variants** |
| Different props or different slots | ❌ Separate components |
| Same structure, minor styling difference (e.g. color) | ✅ Variant with modifier class |
| Same structure, fundamentally different HTML | ✅ Variant with inline if/elseif blocks |

**Example**: A `card` component may appear as a vertical card and a horizontal card. Both accept the same props (`title`, `description`) and the same slots (`media`, `actions`). → This is **one `card` component** with variants `vertical` and `horizontal`.

### Implementation Pattern: Inline Variants

> ⛔ **NO PARTIAL TWIG FILES**: Never create separate `[name]--[variant].twig` files. All variant markup **must be inlined** in the single main `.twig` template using `{% if variant == '...' %}` blocks. This avoids import conflicts with `storybook-addon-sdc` which imports ALL `.twig` files in a directory.

Each component directory contains **exactly one `.twig` file**. Variant-specific markup is handled with `{% if %}`/`{% elseif %}` blocks inside that single file.

**Directory structure:**
```
components/card/
├── card.component.yml       # Single component definition with variants
├── card.vertical.story.yml  # Story for vertical variant
├── card.horizontal.story.yml # Story for horizontal variant
└── card.twig                # Single template — all variants inline
```

**Single template with inline variants (`card.twig`):**
```twig
{#
/**
 * @file
 * Template for card component.
 *
 * Available variables:
 * - variant: Card layout variant (vertical, horizontal).
 * - title: Card title.
 * - description: Card description text.
 * - media: Media slot (image, video, etc.).
 * - actions: Action buttons slot.
 */
#}
{% set variant = variant|default('vertical') %}

{% if variant == 'horizontal' %}
  <div{{ attributes.addClass(['card', 'card-side', 'bg-base-100', 'shadow-sm']) }}>
    {% if media %}
      <figure>{{ media }}</figure>
    {% endif %}
    <div class="card-body">
      {% if title %}<h3 class="card-title">{{ title }}</h3>{% endif %}
      {% if description %}<p>{{ description }}</p>{% endif %}
      {% if actions %}
        <div class="card-actions justify-end">{{ actions }}</div>
      {% endif %}
    </div>
  </div>
{% else %}
  <div{{ attributes.addClass(['card', 'bg-base-100', 'shadow-sm']) }}>
    {% if media %}
      <figure>{{ media }}</figure>
    {% endif %}
    <div class="card-body">
      {% if title %}<h3 class="card-title">{{ title }}</h3>{% endif %}
      {% if description %}<p>{{ description }}</p>{% endif %}
      {% if actions %}
        <div class="card-actions justify-end">{{ actions }}</div>
      {% endif %}
    </div>
  </div>
{% endif %}
```

> **Tip**: When variant markup is nearly identical and only differs in a few CSS classes, use a single block with conditional class assignment instead of duplicating the entire template:
>
> ```twig
> {% set variant = variant|default('vertical') %}
> {% set card_classes = variant == 'horizontal' ? ['card', 'card-side'] : ['card'] %}
>
> <div{{ attributes.addClass(card_classes) }}>
>   {# shared markup #}
> </div>
> ```

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
> **MUST READ** [`resources/layout-reference.md`](resources/layout-reference.md) before generating any layout component.

> [!IMPORTANT]
> **Build layout components FIRST.** Layout components (`container`, `grid`, `section`) are foundational — all other UI components reference and reuse them. Always generate layout components before any other component category.

Layout components (`container`, `grid`, `section`) provide structural framing and grid arrangement. **Never create domain-specific layout components** (e.g. `article-grid`, `blog-grid`, `card-grid`) — always use the generic `grid` component with appropriate column settings.

> [!IMPORTANT]
> **Use `container` everywhere you need max-width and horizontal padding (padding-inline / px).** The `container` component is the **single source** for constraining content width and adding horizontal padding to keep content away from the browser edges. No other component should set its own `max-width` or horizontal browser padding — always wrap in a `container` instead.

> [!IMPORTANT]
> **Resolve `$DESIGNBOOK_SDC_PROVIDER` at generation time.** When generating Twig templates or story YAML files, resolve the SDC provider from `@designbook-configuration` (`basename(drupal.theme)` with `-` → `_`) and use the actual value (e.g., `test_integration_drupal`) in all `include()` calls and `component:` references. Never leave `$DESIGNBOOK_SDC_PROVIDER` as a literal string in generated files.

→ Full component definitions, Twig templates, and story examples in [`resources/layout-reference.md`](resources/layout-reference.md)

---

## Rules, Principles, and Error Handling

→ See [`resources/rules.md`](resources/rules.md) for all conventions.

Key principles: kebab-case naming, variants over duplication, three files per component, generic naming (no business logic), placeholder images (`https://placehold.co/`) only, `group:` key on every component.

