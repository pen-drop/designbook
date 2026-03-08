---
name: Designbook Screen
description: Generates screen design files that compose UI components + entity data into full page views. Uses *.screen.yml format with build-time entity resolution.
---

# Designbook Screen

> Creates `*.screen.yml` files that compose UI components and entity data into full page views. Each section produces one screen file per page (listing, detail, etc.).

> [!IMPORTANT]
> **ONE file per page.** Each page in a section gets its own `*.screen.yml` file.
>
> | Section | Screen files |
> |---------|-------------|
> | blog | `section-blog.listing.screen.yml`, `section-blog.detail.screen.yml` |
> | news | `section-news.listing.screen.yml`, `section-news.detail.screen.yml` |

## Prerequisites

1. **Data model** (schema only): `$DESIGNBOOK_DIST/data-model.yml`
2. **View mode expressions**: `$DESIGNBOOK_DIST/view-modes/{entity_type}.{bundle}.{view_mode}.jsonata` — see `designbook-view-modes` skill
3. **Sample data** per section: `$DESIGNBOOK_DIST/sections/{section}/data.yml`
4. **UI components** must exist (heading, figure, text-block, etc.)
5. **Page component** must exist with `header`, `content`, `footer` slots — see `debo-design-shell` workflow
6. **Header/Footer components** must exist — see `debo-design-shell` workflow
7. **Screen designs** (optional): `$DESIGNBOOK_DIST/sections/{section}/spec.section.yml` (under `screen` key)

## Output Structure

```
$DESIGNBOOK_DIST/
└── sections/
    └── blog/
        ├── data.yml
        ├── spec.section.yml  # includes screen key
        └── screens/
            ├── section-blog.detail.screen.yml
            └── section-blog.listing.screen.yml
```

> **Naming**: `section-[sectionid].[pagename].screen.yml`

## The `*.screen.yml` Format

Every screen uses the `page` component as the root container — slotting in `header`, `content`, and `footer`:

```yaml
name: Detail — Blog Article (Full View Mode)
section: blog
group: Designbook/Sections/Blog

layout:
  page:
    - component: page
      slots:
        header:
          - component: header
            props:
              logo: "PetMatch"
              nav_items:
                - { label: "Home", href: "/" }
                - { label: "Blog", href: "/blog" }
        content:
          - entity: node.article
            view_mode: full
            record: 0
        footer:
          - component: footer
            props:
              copyright: "© 2026 PetMatch"
```

> [!IMPORTANT]
> **Always wrap in `page` component.** The `page` component provides the application shell (header, content area, footer). Every section screen should use it so that the full-page layout is visible in Storybook.

### Top-level Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | ✅ | Display name in Storybook sidebar |
| `section` | ❌ | Section ID — locates `sections/{section}/data.yml` |
| `group` | ❌ | Storybook sidebar group. Default: `Designbook/Sections/{section}` |
| `layout` | ✅ | Map of slot names → arrays of entries |

### Component Entry

Reference a UI component directly with props and slot content:

```yaml
- component: heading
  props:
    level: h1
  slots:
    text: Blog
  story: default           # Optional: load args from an existing story
```

### Entity Entry

Reference an entity from the data model. Resolved at build time:

```yaml
- entity: node.article      # "<entity_type>.<bundle>"
  view_mode: full            # Which view_modes.mapping[] to use
  record: 0                  # Sample data record index (default: 0)
```

### Records Shorthand

For listing pages with multiple items, use `records` instead of repeating entries:

```yaml
- entity: node.article
  view_mode: teaser
  records: [0, 1, 2]         # Expands to 3 separate entries
```

## Execution Steps

### Step 1: Check Prerequisites

```bash
ls $DESIGNBOOK_DIST/data-model.yml 2>/dev/null
ls $DESIGNBOOK_DIST/sections/$SECTION_ID/data.yml 2>/dev/null
```

Verify entity type has view mode mappings in `data-model.yml`:
- `content.[entity_type].[bundle].view_modes.[mode].mapping` must exist

Check that `page`, `header`, and `footer` components exist. If not, tell the user to run `/debo-design-shell` first.

### Step 2: Parse Screen Designs

Read the `screen` key from `spec.section.yml` (if it exists) and extract for each page:
- **Page name** (kebab-case: `listing`, `detail`)
- **Entity type/bundle** (e.g. `node.article`)
- **View mode** (`full`, `teaser`)
- **Extra UI elements** (filter bars, pagination, sidebars)

### Step 3: Check for Section-Level UI Components

Review screen designs for elements beyond entity + shell:

| Element | Example | Action |
|---------|---------|--------|
| Filter bar | Listing page filter | Create UI component first |
| Pagination | Multi-page listing | Create UI component first |
| Sidebar | Related content | Add as extra slot in content |

### Step 4: Create Screen Files

Create `sections/{section}/screens/section-{section}.{page}.screen.yml` for each page.

**Detail page** — single entity wrapped in page component:

```yaml
name: Detail — Blog Article (Full View Mode)
section: blog
group: Designbook/Sections/Blog

layout:
  page:
    - component: page
      slots:
        header:
          - component: header
            props:
              logo: "PetMatch"
              nav_items:
                - { label: "Home", href: "/" }
                - { label: "Blog", href: "/blog" }
        content:
          - entity: node.article
            view_mode: full
            record: 0
        footer:
          - component: footer
            props:
              copyright: "© 2026 PetMatch"
```

**Listing page** — multiple entities wrapped in page component:

```yaml
name: Listing — Articles (Teaser View Mode)
section: blog
group: Designbook/Sections/Blog

layout:
  page:
    - component: page
      slots:
        header:
          - component: header
            props:
              logo: "PetMatch"
              nav_items:
                - { label: "Home", href: "/" }
                - { label: "Blog", href: "/blog" }
        content:
          - component: heading
            props:
              level: h1
            slots:
              text: Alle Artikel
          - entity: node.article
            view_mode: teaser
            records: [0, 1, 2]
        footer:
          - component: footer
            props:
              copyright: "© 2026 PetMatch"
```

> [!TIP]
> **Reuse shell values.** Read the shell screen at `$DESIGNBOOK_DIST/shell/shell.screen.yml` to get the header/footer props (logo, nav_items, copyright, links). Use the same values in section screens for consistency.

### Step 5: Verify in Storybook

Open Storybook — screens appear under their `group` in the sidebar. Each should render the full page layout (header + content + footer) with actual styled HTML via Twig.

## Provider Prefix

Component names are prefixed with the `provider` from config at render time:

- `heading` → `daisy_cms_daisyui:heading` (resolves to SDC component)

## Error Handling

| Error | Fix |
|-------|-----|
| Component not found | Create the UI component first |
| Page component missing | Run `/debo-design-shell` to create page/header/footer |
| Entity not in data model | Add entity to `data-model.yml` |
| View mode not defined | Add view mode mapping to data model |
| Record not found | Add more records to `data.yml` |
| No data.yml | Create sample data for this section |
