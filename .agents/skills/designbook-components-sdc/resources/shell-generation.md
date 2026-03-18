# Shell Component Generation

Shell components (header, footer, page) are UI components in the `Shell` category. They contain **real HTML markup** and compose other UI components via slots. Unlike other UI components which are generic building blocks, shell components have a **generation workflow** that auto-derives navigation from section definitions.

> ⛔ **CRITICAL RULE — No Inline Markup in Stories**: Shell stories must contain **only `type: component`** references. Never use `type: element` with HTML tags or attributes. Every visual piece must be a reusable UI component. If a required UI component doesn't exist, **create it first**.

> ⛔ **CRITICAL RULE — No `type: element` in Scenes**: In `*.scenes.yml` files, **never use `type: element`** nodes inside slots. Use plain string values for text content (e.g. `text: 'Contact'` instead of `- type: element\n  value: 'Contact'`). `type: element` is only valid in component `*.story.yml` files. In scenes, the scene builder does not resolve element nodes — they crash the CSF module build.

> ⛔ **CRITICAL RULE — Phase-Based Generation with Per-Component Validation**: Generate in three phases: **Phase 1: ALL Twig → Phase 2: ALL Stories → Phase 3: Each Component YAML + Validate**. Read the corresponding skill resource once at the start of each phase. In Phase 3, validate each component immediately after writing its `.component.yml`.

> **Stories**: Shell components have exactly **one story** (`default`) per component — there is only one meaningful visual configuration for header/footer.

| Component | `group:` | Slots |
|-----------|---------|-------|
| `page` | `Shell` | `header`, `content`, `footer` |
| `header` | `Shell` | `logo`, `navigation`, `actions` |
| `footer` | `Shell` | `navigation`, `copyright` |

All shell components are regular UI components: they live in `$DESIGNBOOK_DRUPAL_THEME/components/header/` (or `footer/`), use the theme provider, and have real HTML in their Twig templates.

## Shell Generation Steps

When generating shell components, follow this workflow:

### Shell Step 1: Check If Shell Already Exists

Check for existing shell components:

```bash
ls $DESIGNBOOK_DRUPAL_THEME/components/header/header.component.yml 2>/dev/null
ls $DESIGNBOOK_DRUPAL_THEME/components/footer/footer.component.yml 2>/dev/null
```

**If both exist and `force` is `false`:**
> "✅ Shell components already exist. Use `force: true` to regenerate."

Stop here.

### Shell Step 2: Read Section Navigation

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

### Shell Step 3: Identify Required UI Components

Before generating shell components, identify which **UI components** are needed. Every slot in the shell must be filled by a component reference — no inline markup.

**Required shell components (`page`, `header`, `footer`):**

| Component | Slots | Description |
|-----------|-------|-------------|
| `page` | `header`, `content`, `footer` | Full-page layout wrapper — the root component in the shell scene |
| `header` | `logo`, `navigation`, `actions` | Site header |
| `footer` | `navigation`, `copyright` | Site footer |

**Required UI components for the header:**

| Slot | UI Component | Description |
|------|-------------|-------------|
| `logo` | `logo` | Site branding / logo display |
| `navigation` | `navigation` (variant: `primary`) | Primary navigation menu, accepts items as props |
| `actions` | `button` | CTA or action buttons |

**Required UI components for the footer:**

| Slot | UI Component | Description |
|------|-------------|-------------|
| `navigation` | `navigation` (variant: `footer`) | Footer navigation links, accepts items as props |
| `copyright` | `copyright` | Copyright text display |

**3.1 — Audit existing UI components:**

```bash
find $DESIGNBOOK_DRUPAL_THEME/components/ -name "*.component.yml" 2>/dev/null | sort
```

**3.2 — Create missing UI components:**

For each required UI component that doesn't exist, create it following the phased approach below.

> **Navigation** is a **single component with variants** (`primary`, `footer`). Both variants accept the same `items` prop (array of `{label, url}`) but differ in visual layout. See `rules/sdc-conventions.md` — "Variants Instead of Duplicate Components".

Present the plan to the user and ask for confirmation:

> "For the shell I need these UI components:
>
> | Component | Status | Description |
> |-----------|--------|-------------|
> | `logo` | 🆕 NEW | Site branding |
> | `navigation` | 🆕 NEW | Navigation with variants (primary, footer) |
> | `copyright` | 🆕 NEW | Copyright text |
> | `button` | ✅ EXISTS | Already in component library |
>
> Shall I create the missing components?"

### Shell Step 4: Phase 1 — Generate ALL Twig Templates

> ⛔ **Read these resources NOW** before writing any Twig file:
> 1. `resources/twig.md` — template structure and rules
> 2. `@designbook-css-$DESIGNBOOK_FRAMEWORK_CSS/SKILL.md` — CSS classes to use (e.g. DaisyUI/Tailwind classes)

Generate Twig templates for ALL components (UI + shell) in this phase. No `.story.yml` or `.component.yml` files yet.

**Generation order** (dependencies first):
1. `logo` — no dependencies
2. `navigation` — no dependencies (variants: primary, footer)
3. `copyright` — no dependencies
4. `button` — no dependencies (skip if already exists)
5. `header` — depends on logo, navigation, button
6. `footer` — depends on navigation, copyright

**Header Twig** (`header.twig`):
```twig
{# header.twig #}
<header{{ attributes.addClass(['[css-framework-classes]']) }}>
  {{ logo }}
  {{ navigation }}
  {{ actions }}
</header>
```

**Footer Twig** (`footer.twig`):
```twig
{# footer.twig #}
<footer{{ attributes.addClass(['[css-framework-classes]']) }}>
  {{ navigation }}
  {{ copyright }}
</footer>
```

Replace `[css-framework-classes]` with actual classes from `@designbook-css-$DESIGNBOOK_FRAMEWORK_CSS/SKILL.md`.

Also generate Twig templates for all UI components identified in Step 3 (logo, navigation, copyright, button, etc.).

### Shell Step 5: Phase 2 — Generate ALL Stories

> ⛔ **Read `resources/story-yml.md` NOW** before writing any story file.

Generate story files for ALL components. Stories must use **only `type: component` references** for shell components.

**Header story** (`header.default.story.yml`):
```yaml
name: default
slots:
  logo:
    - type: component
      component: '[ui_provider]:logo'
      props:
        name: '[PRODUCT_NAME]'
  navigation:
    - type: component
      component: '[ui_provider]:navigation'
      props:
        variant: primary
        items:
          - label: '[Section 1 Title]'
            url: '/[section-1-id]'
          - label: '[Section 2 Title]'
            url: '/[section-2-id]'
  actions:
    - type: component
      component: '[ui_provider]:button'
      props:
        variant: default
      slots:
        text: 'Contact'
```

**Footer story** (`footer.default.story.yml`):
```yaml
name: default
slots:
  navigation:
    - type: component
      component: '[ui_provider]:navigation'
      props:
        variant: footer
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

Also generate stories for all UI components (logo, navigation, copyright, button, etc.).

Replace `[ui_provider]` with the project's SDC UI provider from config.
Replace `[PRODUCT_NAME]` with the product name from `vision.md`.
Replace navigation items with those built in Shell Step 2.

### Shell Step 6: Phase 3 — Generate Component YAMLs + Validate Per Component

> ⛔ **Read `resources/component-yml.md` NOW** before writing any component YAML.

For each component: write `.component.yml`, then immediately validate before proceeding to the next.

Load `@designbook-components-sdc/steps/validate.md` — fix loop until exit 0 before proceeding to the next component.

**Page** (`page.component.yml`):
```yaml
$schema: "https://git.drupalcode.org/project/drupal/-/raw/HEAD/core/assets/schemas/v1/metadata.schema.json"
name: page
status: experimental
group: Shell
description: Full-page layout wrapper with header, main content area, and footer slots.
provider: [DESIGNBOOK_SDC_PROVIDER]
thirdPartySettings:
  sdcStorybook:
    disableBasicStory: true
    tags:
      - "!autodocs"
slots:
  header:
    title: Header
    description: Site header content
  content:
    title: Content
    description: Main page content area
  footer:
    title: Footer
    description: Site footer content
```

**Header** (`header.component.yml`):
```yaml
$schema: "https://git.drupalcode.org/project/drupal/-/raw/HEAD/core/assets/schemas/v1/metadata.schema.json"
name: header
status: experimental
group: Shell
description: Application header with logo, navigation, and action buttons.
provider: [DESIGNBOOK_SDC_PROVIDER]
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
  actions:
    title: Actions
    description: CTA buttons or action items
```

**Footer** (`footer.component.yml`):
```yaml
$schema: "https://git.drupalcode.org/project/drupal/-/raw/HEAD/core/assets/schemas/v1/metadata.schema.json"
name: footer
status: experimental
group: Shell
description: Application footer with navigation links and copyright.
provider: [DESIGNBOOK_SDC_PROVIDER]
thirdPartySettings:
  sdcStorybook:
    disableBasicStory: true
    tags:
      - "!autodocs"
slots:
  navigation:
    title: Navigation
    description: Footer navigation links
  copyright:
    title: Copyright
    description: Copyright text
```

Also generate `.component.yml` for all UI components, validating each one after creation.

### Shell Step 7: Create Shell Scene File

> ⛔ **Read `@designbook-scenes/SKILL.md` NOW** for the scenes format.

> ⛔ **CRITICAL RULE — Explicit slots, no bare `story: default`**: The shell scene MUST inline ALL slots for `header` and `footer` — including `logo`, `navigation` (with `items` prop populated from Shell Step 2), and `actions`/`copyright`. Never use `story: default` alone in a scene; the scene must be self-contained so every slot renders correctly.

Create `${DESIGNBOOK_DIST}/design-system/design-system.scenes.yml`. The shell scene uses the `page` component with header, content, and footer slots fully specified inline:

```yaml
id: design-system
title: Design System
description: [Shell layout description]
status: planned
order: 0

group: "Designbook/Design System"
scenes:
  - name: shell
    items:
      - component: [DESIGNBOOK_SDC_PROVIDER]:page
        slots:
          header:
            - component: [DESIGNBOOK_SDC_PROVIDER]:header
              slots:
                logo:
                  - component: [DESIGNBOOK_SDC_PROVIDER]:logo
                    props:
                      name: '[PRODUCT_NAME]'
                navigation:
                  - component: [DESIGNBOOK_SDC_PROVIDER]:navigation
                    props:
                      variant: primary
                      items:
                        - label: '[Section 1 Title]'
                          url: '/[section-1-id]'
                        - label: '[Section 2 Title]'
                          url: '/[section-2-id]'
                        # Add all sections from Shell Step 2 here
                actions:
                  - component: [DESIGNBOOK_SDC_PROVIDER]:button
                    props:
                      variant: default
                    slots:
                      text: 'Contact'
          content: $content        # injection point — filled by section scenes via with:
          footer:
            - component: [DESIGNBOOK_SDC_PROVIDER]:footer
              slots:
                navigation:
                  - component: [DESIGNBOOK_SDC_PROVIDER]:navigation
                    props:
                      variant: footer
                      items:
                        - { label: 'Privacy', url: '/privacy' }
                        - { label: 'Terms', url: '/terms' }
                        - { label: 'Imprint', url: '/imprint' }
                copyright:
                  - component: [DESIGNBOOK_SDC_PROVIDER]:copyright
                    props:
                      text: '© 2026 [PRODUCT_NAME]. All rights reserved.'

```

Replace `[PRODUCT_NAME]` with the product name from `vision.md`.
Replace navigation items with the full list built in Shell Step 2 (sorted by `order` field).

Section scenes inherit this shell via `type: scene` in their `items`:

```yaml
# sections/blog/blog.section.scenes.yml
scenes:
  - name: "Blog Detail"
    items:
      - type: scene
        ref: design-system:shell
        with:
          content:
            - entity: node.article
              view_mode: full
              record: 0
```

### Shell Step 8: Final Summary

After all components are generated and validated:

> "✅ **Shell components created!**
>
> **UI Components created:**
> | Component | Path | Validated |
> |-----------|------|-----------|
> | `logo` | `components/logo/` | ✅ |
> | `navigation` | `components/navigation/` (variants: primary, footer) | ✅ |
> | `copyright` | `components/copyright/` | ✅ |
>
> **Shell Components:**
> | Component | Path | Validated |
> |-----------|------|-----------|
> | `page` | `components/page/` — header, content, footer slots | ✅ |
> | `header` | `components/header/` — references logo, navigation, button | ✅ |
> | `footer` | `components/footer/` — references navigation, copyright | ✅ |
>
> **Scene file:** `design-system/design-system.scenes.yml` — shell + minimal scenes
>
