# Shell Component Generation

Shell components (header, footer, page) are UI components in the `Shell` category. They contain **real HTML markup** and compose other UI components via slots. Unlike other UI components which are generic building blocks, shell components have a **generation workflow** that auto-derives navigation from section definitions.

> ⛔ **CRITICAL RULE — No Inline Markup in Stories**: Shell stories must contain **only `type: component`** references. Never use `type: element` with HTML tags or attributes. Every visual piece must be a reusable UI component. If a required UI component doesn't exist, **create it first**.

> **Stories**: Shell components have exactly **one story** (`default`) per component — there is only one meaningful visual configuration for header/footer.

| Component | `group:` | Slots |
|-----------|---------|-------|
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

For each required UI component that doesn't exist, create it using this skill. Place them in the **project's UI component library**:

```
$DESIGNBOOK_DRUPAL_THEME/components/
├── logo/
│   ├── logo.component.yml
│   ├── logo.story.yml
│   └── logo.twig
├── navigation/
│   ├── navigation.component.yml
│   ├── navigation.story.yml
│   ├── navigation.twig
│   ├── navigation--primary.twig
│   └── navigation--footer.twig
└── copyright/
    ├── copyright.component.yml
    ├── copyright.story.yml
    └── copyright.twig
```

> **Navigation** is a **single component with variants** (`primary`, `footer`). Both variants accept the same `items` prop (array of `{label, url}`) but differ in visual layout. See [Variants Instead of Duplicate Components](../SKILL.md#variants-instead-of-duplicate-components).

Each UI component should:
- Have appropriate **props** (e.g., `navigation` has an `items` prop) 
- Have a **story** that renders realistic content
- Have a **Twig template** with semantic HTML markup
- Use the correct **provider** from the theme config (e.g., `daisy_cms_daisyui`)

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

### Shell Step 4: Generate Header Component

Build the header component definition:

```yaml
# header.component.yml
$schema: "https://git.drupalcode.org/project/drupal/-/raw/HEAD/core/assets/schemas/v1/metadata.schema.json"
name: header
status: experimental
group: Shell
description: Application header with logo, navigation, and action buttons.
provider: daisy_cms_daisyui
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
        text:
          - type: element
            value: 'Contact'
```

Replace `[ui_provider]` with the project's SDC UI provider from config.
Replace `[PRODUCT_NAME]` with the product name from `product-overview.md`.
Replace navigation items with those built in Shell Step 2.

The Twig template for the header contains **real HTML markup**:

```twig
{# header.twig — real markup, shell is a UI component #}
<header{{ attributes.addClass(['header']) }}>
  <div class="header__logo">{{ logo }}</div>
  <nav class="header__navigation">{{ navigation }}</nav>
  <div class="header__actions">{{ actions }}</div>
</header>
```

### Shell Step 5: Generate Footer Component

Build the footer component definition:

```yaml
# footer.component.yml
$schema: "https://git.drupalcode.org/project/drupal/-/raw/HEAD/core/assets/schemas/v1/metadata.schema.json"
name: footer
status: experimental
group: Shell
description: Application footer with navigation links and copyright.
provider: daisy_cms_daisyui
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

The story must use **only component references**:

```yaml
# footer.default.story.yml
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

The Twig template for the footer contains **real HTML markup**:

```twig
{# footer.twig — real markup, shell is a UI component #}
<footer{{ attributes.addClass(['footer']) }}>
  <nav class="footer__nav">{{ navigation }}</nav>
  <div class="footer__copyright">{{ copyright }}</div>
</footer>
```

### Shell Step 6: Verify Output

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
> | `navigation` | `components/navigation/` (variants: primary, footer) |
> | `copyright` | `components/copyright/` |
>
> **Shell Components:**
> - `header` — references `logo`, `navigation` (primary), `button`
> - `footer` — references `navigation` (footer), `copyright`
>
> Next: Run `designbook-entity` to generate entity design components."
