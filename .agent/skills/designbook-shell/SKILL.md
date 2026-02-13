---
name: Designbook Shell
description: Generates shell design components (header, footer) with auto-derived navigation from sections. Load this skill when DESIGNBOOK_TECHNOLOGY is drupal.
---

# Designbook Shell

This skill generates **structural shell components** for site-wide layout elements (header, footer). These are design-phase prototypes that compose UI components into the site shell structure.

Shell components are **structural only** — they define *what* is shown (navigation, logo, user menu) but delegate *how* it looks to UI components.

> ⛔ **CRITICAL RULE — No Inline Markup**: Shell stories must contain **only `type: component`** references. Never use `type: element` with HTML tags or attributes. Every visual piece must be a reusable UI component. If a required UI component doesn't exist, **create it first**.

| Output | Description |
|--------|-------------|
| `shell_header` | Header with navigation, logo, user menu slots |
| `shell_footer` | Footer with footer navigation, copyright slots |

All shell components must include `group: Designbook/Shell` in their `component.yml`.

## Prerequisites

1. This skill is **technology-specific** and should only be used when `DESIGNBOOK_TECHNOLOGY` is set to `drupal` in `designbook.config.yml`.
2. Load the configuration using the `designbook-configuration` skill to get `DESIGNBOOK_DIST` and `DESIGNBOOK_DRUPAL_THEME`.
3. At least one `sections/*.section.yml` file should exist (for navigation auto-generation). If none exist, the skill warns but still generates components with empty navigation.

## Input Parameters

Expected as JSON object:

```json
{
  "force": false
}
```

**Optional fields:**
- `force` (boolean, defaults to `false`). When `true`, regenerates shell components even if they already exist.

## Output Structure

```
$DESIGNBOOK_DIST/
└── components/
    ├── shell-header/
    │   ├── shell-header.component.yml
    │   ├── shell-header.story.yml
    │   └── shell-header.twig
    └── shell-footer/
        ├── shell-footer.component.yml
        ├── shell-footer.story.yml
        └── shell-footer.twig
```

## Execution Steps

### Step 1: Check If Shell Already Exists

Check for existing shell components:

```bash
ls $DESIGNBOOK_DIST/components/shell-header/shell-header.component.yml 2>/dev/null
ls $DESIGNBOOK_DIST/components/shell-footer/shell-footer.component.yml 2>/dev/null
```

**If both exist and `force` is `false`:**
> "✅ Shell components already exist. Use `force: true` to regenerate."

Stop here.

### Step 2: Read Section Navigation

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

### Step 3: Identify Required UI Components

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

For each required UI component that doesn't exist, create it using the `designbook-drupal-components` skill. Place them in the **project's UI component library**:

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

### Step 4: Generate Header Component

Build the header component definition:

```yaml
# shell-header.component.yml
name: shell_header
label: Shell Header
status: experimental
group: Designbook/Shell
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

Build the header component definition. The story must use **only component references**:

```yaml
# shell-header.story.yml
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
Replace navigation items with those built in Step 2.

> ⛔ **MANDATORY Twig Template — NO HTML**: The Twig template for shell components must contain **only slot variable outputs**. No HTML tags, no wrapper elements, no BEM classes.

```twig
{# shell-header.twig — CORRECT: slots only, zero HTML #}
{{ logo }}
{{ navigation }}
{{ user_menu }}
```

```twig
{# ❌ WRONG — never do this in shell templates: #}
<header class="shell-header">
  <div class="shell-header__logo">{{ logo }}</div>
  <nav class="shell-header__navigation">{{ navigation }}</nav>
</header>
```

**Delegate** to `designbook-drupal-components` with this definition.

### Step 5: Generate Footer Component

Build the footer component definition:

```yaml
# shell-footer.component.yml
name: shell_footer
label: Shell Footer
status: experimental
group: Designbook/Shell
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
# shell-footer.story.yml
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

> ⛔ **MANDATORY Twig Template — NO HTML**: Same rule as header.

```twig
{# shell-footer.twig — CORRECT: slots only, zero HTML #}
{{ footer_nav }}
{{ copyright }}
```

**Delegate** to `designbook-drupal-components` with this definition.

### Step 6: Verify Output

Check that all files were created:

```bash
find $DESIGNBOOK_DIST/components/shell-* -type f | sort
find $DESIGNBOOK_DRUPAL_THEME/components/ -name "*.component.yml" | sort
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
> **Shell Design Components:**
> - `shell-header` — references `logo`, `nav-main`, `user-menu`
> - `shell-footer` — references `nav-footer`, `copyright`
>
> Next: Run `designbook-entity` to generate entity design components."

## Error Handling

- **Missing DESIGNBOOK_DIST**: Report that config is not loaded, suggest running `designbook-configuration`
- **No section files**: Warn but continue with empty navigation
- **UI component creation fails**: Report which component failed and why
- **File write fails**: Report which file failed and why
- **designbook-drupal-components fails**: Pass through the error message

## Design Principles

1. **No inline markup in stories**: Shell stories contain **only `type: component`** references — never `type: element` with HTML tags or attributes
2. **No HTML in Twig templates**: Shell `.twig` files contain **only slot variable outputs** (`{{ logo }}`, `{{ navigation }}`, etc.) — **zero HTML tags**, no `<header>`, no `<div>`, no `<nav>`, no BEM classes. All HTML structure and styling lives in the referenced UI components
3. **UI components first**: Create reusable UI components before building shell design components. UI components live in `$DESIGNBOOK_DRUPAL_THEME/components/`, designbook components live in `$DESIGNBOOK_DIST/components/`
4. **Auto-navigation**: Menu items are derived from section.yml files, not hardcoded
5. **Idempotent**: Skips generation if files exist (unless `force: true`)
6. **Delegated**: Actual file creation is handled by `designbook-drupal-components`
7. **Provider**: Uses `designbook_design` as SDC provider for design components. UI components use the theme's provider
