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
| Entity | `designbook-drupal-components-entity` | ❌ No — structural wrapper | `$DESIGNBOOK_DIST/components/entity-*/` | `entity-` | `designbook_design` |
| Screen | `designbook-drupal-components-screen` | ❌ No — slots only | `$DESIGNBOOK_DIST/components/section-*/` | `section-` | `designbook_design` |

---

### UI Component Categories

All UI components use a `group:` key in `.component.yml` to organize them into categories in Storybook's sidebar.

| Category | `group:` value | Example Components |
|----------|---------------|-------------------|
| **Action** | `Action` | button, link |
| **Data Display** | `Data Display` | card, heading, text-block, figure, badge |
| **Navigation** | `Navigation` | nav-main, nav-footer, breadcrumb |
| **Layout** | `Layout` | grid |
| **Shell** | `Shell` | header, footer, page |

> **Shell components** (header, footer, page) are regular UI components with real HTML+CSS markup. They live in `$DESIGNBOOK_DRUPAL_THEME/components/header/` alongside all other UI components and use the theme provider. They compose other UI components via slots (logo, navigation, user menu, etc.). See [Shell Components](#shell-components) for generation details.

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
- `outputDir` (string, defaults to `$DESIGNBOOK_DRUPAL_THEME/components/[component-name]`). When provided, files are written to this directory instead of the default. Used by design skills (`designbook-entity`, `designbook-screen`) to write designbook components to `$DESIGNBOOK_DIST/components/`.

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
> - Group: [group]
> - Status: [status]
> - Variants: [count]
> - Props: [count]
> - Slots: [count]
> - Stories: [count]"

**If failed:**
> "❌ Failed to create component files. Check the error above."

---

## Variants Instead of Duplicate Components

> ⛔ **CRITICAL RULE — One Component, Multiple Variants**: When two potential components share **essentially the same props and slots** (i.e. the same SDC structure) but differ in **layout or visual arrangement**, they **must** be implemented as **variants of a single component** — never as separate components.

### When to Use Variants

| Scenario | Approach |
|----------|----------|
| Same props + same slots, different layout | ✅ **Single component with variants** |
| Different props or different slots | ❌ Separate components |
| Same structure, minor styling difference (e.g. color) | ✅ Variant with CSS modifier class |
| Same structure, fundamentally different HTML | ✅ Variant with separate Twig include |

**Example**: A `card` component may appear as a vertical card and a horizontal card. Both accept the same props (`title`, `description`) and the same slots (`media`, `actions`). → This is **one `card` component** with variants `vertical` and `horizontal`.

### Implementation Pattern: Twig Includes per Variant

When the layout between variants is significantly different, use a **Twig include for each variant**. The main template dispatches to the correct include based on the `variant` prop.

**Directory structure:**
```
components/card/
├── card.component.yml       # Single component definition with variants
├── card.story.yml           # Stories for each variant
├── card.twig                # Main template — dispatches to includes
├── card--vertical.twig      # Layout for vertical variant
├── card--horizontal.twig    # Layout for horizontal variant
└── card.css                 # Optional shared styles
```

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

Each variant should have its own story in the `.story.yml` file so it appears separately in Storybook:

```yaml
# card.story.yml
stories:
  - name: vertical
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
  - name: horizontal
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

Shell components (header, footer, page) are UI components in the `Shell` category. They contain **real HTML+CSS markup** and compose other UI components via slots. Unlike other UI components which are generic building blocks, shell components have a **generation workflow** that auto-derives navigation from section definitions.

> ⛔ **CRITICAL RULE — No Inline Markup in Stories**: Shell stories must contain **only `type: component`** references. Never use `type: element` with HTML tags or attributes. Every visual piece must be a reusable UI component. If a required UI component doesn't exist, **create it first**.

> **Stories**: Shell components have exactly **one story** (`default`) per component — there is only one meaningful visual configuration for header/footer.

| Component | `group:` | Slots |
|-----------|---------|-------|
| `header` | `Shell` | `logo`, `navigation`, `user_menu` |
| `footer` | `Shell` | `footer_nav`, `copyright` |

All shell components are regular UI components: they live in `$DESIGNBOOK_DRUPAL_THEME/components/header/` (or `footer/`), use the theme provider, and have real HTML+CSS in their Twig templates.

### Shell Generation Steps

When generating shell components, follow this workflow:

#### Shell Step 1: Check If Shell Already Exists

Check for existing shell components:

```bash
ls $DESIGNBOOK_DRUPAL_THEME/components/header/header.component.yml 2>/dev/null
ls $DESIGNBOOK_DRUPAL_THEME/components/footer/footer.component.yml 2>/dev/null
```

**If both exist and `force` is `false`:**
> "✅ Shell components already exist. Use `force: true` to regenerate."

Stop here.

#### Shell Step 2: Read Section Navigation

Scan all section definition files:

```bash
ls $DESIGNBOOK_DIST/sections/*.section.yml
```

Parse each file to extract `id` and `title`. Build a navigation items list:

```yaml
# For each section.yml:
- label: [title]           # e.g. "Secure Blue Vault"
  url: /[id]               # e.g. "/secure-blue-vault"
```

Sort by `order` field if present, otherwise alphabetically by title.

**If no section files found:**
> "⚠️ No section.yml files found. Navigation will be empty. Run `/product-sections` first to define sections."

Continue with empty navigation.

#### Shell Step 3: Identify Required UI Components

Before generating shell components, identify which **UI components** are needed. Every slot in the shell must be filled by a component reference — no inline markup.

**Required UI components for the header:**

| Slot | UI Component | Description |
|------|-------------|-------------|
| `logo` | `logo` | Site branding / logo display |
| `navigation` | `nav-main` | Primary navigation menu, accepts items as props |
| `user_menu` | `user-menu` | User account dropdown / login link |

**Required UI components for the footer:**

| Slot | UI Component | Description |
|------|-------------|-------------|
| `footer_nav` | `nav-footer` | Footer navigation links, accepts items as props |
| `copyright` | `copyright` | Copyright text display |

**3.1 — Audit existing UI components:**

```bash
find $DESIGNBOOK_DRUPAL_THEME/components/ -name "*.component.yml" 2>/dev/null | sort
```

**3.2 — Create missing UI components:**

For each required UI component that doesn't exist, create it using this skill. Place them in the **project's UI component library**:

```
$DESIGNBOOK_DRUPAL_THEME/components/
├── logo/
│   ├── logo.component.yml
│   ├── logo.story.yml
│   └── logo.twig
├── nav-main/
│   ├── nav-main.component.yml
│   ├── nav-main.story.yml
│   └── nav-main.twig
├── nav-footer/
│   ├── nav-footer.component.yml
│   ├── nav-footer.story.yml
│   └── nav-footer.twig
├── user-menu/
│   ├── user-menu.component.yml
│   ├── user-menu.story.yml
│   └── user-menu.twig
└── copyright/
    ├── copyright.component.yml
    ├── copyright.story.yml
    └── copyright.twig
```

Each UI component should:
- Have appropriate **props** (e.g., `nav-main` has an `items` prop) 
- Have a **story** that renders realistic content
- Have a **Twig template** with CSS framework classes (e.g., DaisyUI) for visual styling
- Use the correct **provider** from the theme config (e.g., `daisy_cms_daisyui`)

Present the plan to the user and ask for confirmation:

> "For the shell I need these UI components:
>
> | Component | Status | Description |
> |-----------|--------|-------------|
> | `logo` | 🆕 NEW | Site branding |
> | `nav-main` | 🆕 NEW | Primary navigation (4 items from sections) |
> | `user-menu` | 🆕 NEW | User account dropdown |
> | `nav-footer` | 🆕 NEW | Footer navigation links |
> | `copyright` | 🆕 NEW | Copyright text |
> | `button` | ✅ EXISTS | Already in component library |
>
> Shall I create the missing components?"

#### Shell Step 4: Generate Header Component

Build the header component definition:

```yaml
# header.component.yml
name: header
label: Header
status: experimental
group: Shell
thirdPartySettings:
  sdcStorybook:
    disableBasicStory: true
    tags: 
      - "!autodocs"
slots:
  logo:
    title: Logo
    description: Branding logo
  navigation:
    title: Navigation
    description: Main navigation
  user_menu:
    title: User Menu
    description: User menu
```

Build the header story. The story must use **only component references**:

```yaml
# header.default.story.yml
name: default
slots:
  logo:
    - type: component
      component: '[ui_provider]:logo'
      props:
        name: '[PRODUCT_NAME]'
  navigation:
    - type: component
      component: '[ui_provider]:nav-main'
      props:
        items:
          - label: '[Section 1 Title]'
            url: '/[section-1-id]'
          - label: '[Section 2 Title]'
            url: '/[section-2-id]'
  user_menu:
    - type: component
      component: '[ui_provider]:user-menu'
      props:
        name: 'User'
```

Replace `[ui_provider]` with the project's SDC UI provider from config.
Replace `[PRODUCT_NAME]` with the product name from `product-overview.md`.
Replace navigation items with those built in Shell Step 2.

The Twig template for the header contains **real HTML markup with CSS framework classes**:

```twig
{# header.twig — real markup, shell is a UI component #}
<header{{ attributes.addClass(['header']) }}>
  <div class="header__logo">{{ logo }}</div>
  <nav class="header__navigation">{{ navigation }}</nav>
  <div class="header__user-menu">{{ user_menu }}</div>
</header>
```

#### Shell Step 5: Generate Footer Component

Build the footer component definition:

```yaml
# footer.component.yml
name: footer
label: Footer
status: experimental
group: Shell
thirdPartySettings:
  sdcStorybook:
    disableBasicStory: true
    tags: 
      - "!autodocs"
slots:
  footer_nav:
    title: Footer Navigation
    description: Footer navigation links
  copyright:
    title: Copyright
    description: Copyright text
```

The story must use **only component references**:

```yaml
# footer.default.story.yml
name: default
slots:
  footer_nav:
    - type: component
      component: '[ui_provider]:nav-footer'
      props:
        items:
          - label: 'Privacy'
            url: '/privacy'
          - label: 'Terms'
            url: '/terms'
          - label: 'Imprint'
            url: '/imprint'
  copyright:
    - type: component
      component: '[ui_provider]:copyright'
      props:
        text: '© 2026 [PRODUCT_NAME]. All rights reserved.'
```

The Twig template for the footer contains **real HTML markup with CSS framework classes**:

```twig
{# footer.twig — real markup, shell is a UI component #}
<footer{{ attributes.addClass(['footer']) }}>
  <nav class="footer__nav">{{ footer_nav }}</nav>
  <div class="footer__copyright">{{ copyright }}</div>
</footer>
```

#### Shell Step 6: Verify Output

Check that all files were created:

```bash
find $DESIGNBOOK_DRUPAL_THEME/components/header -type f | sort
find $DESIGNBOOK_DRUPAL_THEME/components/footer -type f | sort
```

**If successful:**
> "✅ **Shell components created!**
>
> **UI Components created:**
> | Component | Path |
> |-----------|------|
> | `logo` | `components/logo/` |
> | `nav-main` | `components/nav-main/` |
> | `nav-footer` | `components/nav-footer/` |
> | `user-menu` | `components/user-menu/` |
> | `copyright` | `components/copyright/` |
>
> **Shell Components:**
> - `header` — references `logo`, `nav-main`, `user-menu`
> - `footer` — references `nav-footer`, `copyright`
>
> Next: Run `designbook-entity` to generate entity design components."

---

## Error Handling

- **Missing required parameter**: Report which parameter is missing
- **Invalid status value**: List valid options (`stable`, `experimental`, `deprecated`)
- **Invalid group value**: List valid options (`Action`, `Data Display`, `Navigation`, `Layout`, `Shell`)
- **Component already exists**: Ask for confirmation before overwriting
- **Directory creation fails**: Report filesystem error
- **File write fails**: Report which file failed and why
- **Schema validation fails**: Show errors and fix before continuing
- **No section files (shell)**: Warn but continue with empty navigation

## Design Principles

1. **Consistent naming**: Directory name = file base name. Always kebab-case. `button/button.*`, `nav-main/nav-main.*`
2. **Variants over duplication**: When components share the same props and slots, use a single component with variants and per-variant Twig includes (`[name]--[variant].twig`) instead of creating separate components
3. **Three files minimum, one concern each**: Metadata (`.component.yml`), stories (`.story.yml`), and template (`.twig`) are always separate. Optional `.css` and `.js` follow the same naming pattern
4. **Categorized**: Every component has a `group:` key (`Action`, `Data Display`, `Navigation`, `Layout`, `Shell`) for Storybook sidebar organization
5. **Idempotent**: Running multiple times with same input produces same result
6. **Validated**: Component YAML is validated against the Drupal SDC schema
7. **Safe**: Asks for confirmation before overwriting existing components
8. **Standard**: Follows Drupal SDC and SDC Storybook conventions
9. **Shell = UI**: Shell components (header, footer, page) are full UI components with real HTML+CSS, not structural slot-only wrappers. They compose other UI components via slots
