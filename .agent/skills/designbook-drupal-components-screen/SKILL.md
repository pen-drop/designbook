---
name: Designbook Screen
description: Generates screen design components that compose shell + entity into full page views. Load this skill when DESIGNBOOK_TECHNOLOGY is drupal. Used when building Screen components.
---

# Designbook Screen

> **Component Type: Screen** — This skill generates **screen components**: structural wrappers with **no HTML markup** that compose UI (header/footer) + entity components into full page views. Each section produces exactly **one** component; each page is a **story**.

### Component Type Overview

| Type | Skill | Has Markup? | Location | Prefix | Provider |
|------|-------|-------------|----------|--------|---------|
| UI | `designbook-drupal-components-ui` | ✅ Yes — real HTML + CSS | `$DESIGNBOOK_DRUPAL_THEME/components/` | _(none)_ | Theme provider (e.g. `daisy_cms_daisyui`) |
| Entity | `designbook-drupal-components-entity` | ❌ Minimal — `<article>` wrapper only | `$DESIGNBOOK_DIST/components/entity-*/` | `entity-` | `designbook_design` |
| **Screen** ← this skill | `designbook-drupal-components-screen` | ❌ No — slots only | `$DESIGNBOOK_DIST/components/section-*/` | `section-` | `designbook_design` |

> [!CAUTION]
> **MANDATORY**: Before generating ANY screen components, you MUST read this entire SKILL.md. It contains critical rules about entity story references, slot composition, and the `story:` key requirement.

> [!IMPORTANT]
> **ONE component per section — pages are stories.**
> Each section produces exactly **one** screen component named after the section (e.g. `section-blog`).
> Each page within that section (listing, detail, etc.) is a **separate story** on that component — never a separate component.
>
> | Section | Component | Story files |
> |---------|-----------|-------------|
> | blog | `section-blog` | `section-blog.listing.story.yml`, `section-blog.detail.story.yml` |
> | news | `section-news` | `section-news.listing.story.yml`, `section-news.detail.story.yml` |

---

This skill generates **screen design components** that compose shell UI components (header/footer) and entity components into full page views. Each screen component represents one product section; each page within that section is a story.

Screen components are the **top-level composition layer** — they are structural wrappers with three slots: header, content, footer. The content slot references an entity design component in a specific view mode. Because entity and shell components already reference **real UI components** in their stories, the composed screen renders as a **complete visual design** in Storybook.

> **Visual design flow:** Screen → composes Shell + Entity → each references UI components → produces a real page preview.

## Section Context & Data Resolution
>
> Screen components no longer manage data loading. They compose shell components with **generated sample data stories** from the entity layer.
>
> 1. Shell component (Header)
> 2. **Entity component** — referenced with `story: content_[section]_[viewmode]_[index]` to select a specific materialized record
> 3. Shell component (Footer)
>
> The entity skill generates **two tiers** of stories: template stories (with `type: ref`) and **generated sample data stories** (with materialized values). Screen components reference the **generated** stories — never the templates.
>
> **Story name format:** `content_[section]_[viewmode]_[index]` — e.g., `content_blog_full_0`, `content_blog_teaser_1`

## Prerequisites

1. This skill is **technology-specific** and should only be used when `DESIGNBOOK_TECHNOLOGY` is set to `drupal` in `designbook.config.yml`.
2. Load the configuration using the `designbook-configuration` skill to get `DESIGNBOOK_DIST`.
3. Shell UI components must exist (run `designbook-drupal-components-ui` with shell category first):
   - `$DESIGNBOOK_DRUPAL_THEME/components/header/header.component.yml`
   - `$DESIGNBOOK_DRUPAL_THEME/components/footer/footer.component.yml`
4. Entity components must exist for referenced entities (run `designbook-entity` first).
5. Screen designs must exist: `$DESIGNBOOK_DIST/sections/[section-id]/screen-designs.md`

## Input Parameters

Expected as JSON object:

```json
{
  "section-id": "blog"
}
```

**Optional fields:**
- `section-id` (string). When provided, only generates screen components for that section. When omitted, generates screens for all sections that have `screen-designs.md`.

## Output Structure

Each section produces **one component directory** with one `.component.yml`, one `.twig`, and **one story file per page**:

```
$DESIGNBOOK_DIST/
└── components/
    ├── section-blog/
    │   ├── section-blog.component.yml
    │   ├── section-blog.listing.story.yml    ← listing page
    │   ├── section-blog.detail.story.yml     ← detail page
    │   └── section-blog.twig
    └── section-news/
        ├── section-news.component.yml
        ├── section-news.listing.story.yml
        ├── section-news.detail.story.yml
        └── section-news.twig
```

> **Naming rules:**
> - Directory name = component base name = `section-[sectionid]` (kebab-case)
> - Story files = `section-[sectionid].[pagename].story.yml`
> - The `[pagename]` comes from the page name in `screen-designs.md` (e.g. `listing`, `detail`)

## Execution Steps

### Step 1: Check Prerequisites

Verify shell UI components exist:

```bash
ls $DESIGNBOOK_DRUPAL_THEME/components/header/header.component.yml 2>/dev/null
ls $DESIGNBOOK_DRUPAL_THEME/components/footer/footer.component.yml 2>/dev/null
```

**If missing:**
> "❌ Shell UI components not found. Run `designbook-drupal-components-ui` with shell category first."

Stop here.

### Step 2: Discover Sections

If `section-id` is provided, use only that section. Otherwise, scan for all sections with screen designs:

```bash
find $DESIGNBOOK_DIST/sections/ -name "screen-designs.md" | sort
```

**If no screen designs found:**
> "❌ No screen-designs.md found. Run `/debo-design-screen` first to create screen designs."

Stop here.

### Step 3: Parse Screen Designs

For each section's `screen-designs.md`, extract page definitions. Each page should specify:
- **Page name** — kebab-case identifier (e.g., `listing`, `detail`)
- **Entity reference** — which entity type/bundle is shown (e.g., `node/article`)
- **View mode** — which view mode to use (e.g., `full`, `teaser`)

The **view mode** determines which entity template story was used to generate the sample data stories. Generated story names follow the pattern `content_[section]_[viewmode]_[index]`. The screen story references the entity using `story: content_[section]_[viewmode]_[index]`.

View modes can also be derived from the **data model** (`data-model.json`) if the entity defines `view_modes`. Common view modes:

| View Mode | Page Type | Generated Story Name (example) |
|-----------|-----------|-------------------------------|
| `full` | Detail page | `content_blog_full_0` |
| `teaser` | Listing page / card | `content_blog_teaser_0` |
| `search_result` | Search results | `content_blog_search_result_0` |

> **Parsing strategy:** Look for structured headings or sections in screen-designs.md that define individual pages. The markdown format should have clear page boundaries.

**If parsing fails for a page:**
> "⚠️ Could not parse page definition for `[section-id]/[page]`. Skipping."

Continue with remaining pages.

### Step 4: Check Entity Prerequisites

For each entity referenced in the screen designs, verify the entity component exists:

```bash
ls $DESIGNBOOK_DIST/components/entity-[entitytype]-[bundle]/entity-[entitytype]-[bundle].component.yml 2>/dev/null
```

**If missing:**
> "❌ Entity component `entity-[entitytype]-[bundle]` not found. Run `designbook-entity` first to generate entity components with UI component references."

Stop here.

### Step 4b: Check for Section-Level UI Components

Some screen designs may require **UI components specific to the section** that are not covered by entity or shell components. Examples:

- A **filter bar** for list views
- A **sidebar** with related content
- A **hero banner** at the top of a landing page
- A **pagination** component for multi-page lists
- An **action bar** with buttons for bulk operations

Review the `screen-designs.md` to identify any section-level UI elements that are not fields of an entity and not part of the shell.

**If such elements exist:**

1. Check if suitable UI components already exist in the component library:
   ```bash
   find $DESIGNBOOK_DRUPAL_THEME/components/ -name "*.component.yml" 2>/dev/null | sort
   ```
2. If missing, create them using `designbook-drupal-components-ui` before generating the screen component.
3. Add extra slots to the screen component for these elements (beyond just header/content/footer).

Present findings to the user:

> "The **[page-name]** page includes elements beyond the entity and shell:
>
> | Element | UI Component | Status |
> |---------|-------------|--------|
> | Filter bar | `[ui_provider]:filter-bar` | 🆕 NEW — needs creation |
> | Pagination | `[ui_provider]:pagination` | ✅ exists |
>
> I'll add these as extra slots in the screen component. Shall I proceed?"

### Step 5: Create Screen Component & Stories

For each section, create **one** screen component in `components/section-[sectionid]/`.

#### 5a. Create `section-[sectionid].component.yml`

Define slots for header, content, footer, and any extra slots identified in Step 4b.

#### 5b. Create `section-[sectionid].twig`

Minimal structural template:

```twig
{{ header }}
{{ content }}
{{ footer }}
```

Add any extra slot variables as needed.

#### 5c. Create one story file per page

For each page in the section, create `section-[sectionid].[pagename].story.yml`.

> ⛔ **CRITICAL: The `story:` key is MANDATORY** when referencing entity components. It must point to a **generated sample data story** (e.g., `content_blog_full_0`), not a template story name (e.g., `full`).

**Example — Detail page story (`section-blog.detail.story.yml`):**

```yaml
name: detail
slots:
  header:
    - type: component
      component: '[ui_provider]:header'
      story: default
  content:
    - type: component
      component: 'designbook_design:entity-node-article'
      story: content_blog_full_0   # ← generated story for record 0, full view
  footer:
    - type: component
      component: '[ui_provider]:footer'
      story: default
```

**Example — Listing page story (`section-blog.listing.story.yml`):**

```yaml
name: listing
slots:
  header:
    - type: component
      component: '[ui_provider]:header'
      story: default
  content:
    - type: component
      component: '[ui_provider]:article-grid'
      props:
        title: 'Blog'
      slots:
        items:
          - type: component
            component: 'designbook_design:entity-node-article'
            story: content_blog_teaser_0   # ← generated story for record 0
          - type: component
            component: 'designbook_design:entity-node-article'
            story: content_blog_teaser_1   # ← generated story for record 1
          - type: component
            component: 'designbook_design:entity-node-article'
            story: content_blog_teaser_2   # ← generated story for record 2
  footer:
    - type: component
      component: '[ui_provider]:footer'
      story: default
```

> **Note:** No `props` or `_entity` overrides needed on the screen level — all data is already materialized in the generated entity stories.


### Step 6: Verify Output

Check that the screen component was created for each section with the expected stories:

```bash
find $DESIGNBOOK_DIST/components/section-* -name "*.component.yml" -o -name "*.story.yml" | sort
```

**If successful:**
> "✅ **Screen components created!**
>
> | Section | Component | Pages (Stories) |
> |---------|-----------|-----------------|
> | blog | `section-blog` | `listing`, `detail` |
> | news | `section-news` | `listing`, `detail` |
>
> Open Storybook to see the full page compositions under Sections/* in the sidebar.
>
> **Tip:** To regenerate after changing screen designs, run this skill again."

## Error Handling

- **Missing shell components**: Report error, suggest running `designbook-drupal-components-ui` with shell category
- **Missing entity components**: Report error, list which entities are missing, suggest running `designbook-entity`
- **Missing screen-designs.md**: Report error, suggest running `/debo-design-screen`
- **Unparseable screen design**: Warn, skip that page, continue with others
- **File write fails**: Report which screen/file failed and why
- **designbook-drupal-components fails**: Pass through the error message

## Design Principles

1. **One component per section**: Each section → one component (`section-blog`). Pages are stories, not components.
2. **Consistent naming**: Directory name = file base name = `section-[sectionid]`. Stories = `section-[sectionid].[pagename].story.yml`. Group key: `Section/[SECTION_ID]`
3. **Structural templates, composed design**: Screen Twig templates contain `{{ header }}{{ content }}{{ footer }}` — nothing else. But the composed story renders a **complete visual page** because shell and entity stories already reference real UI components
4. **No inline markup**: Screen stories use **only `type: component`** references — composing shell and entity design components
5. **Composition**: Screens compose existing shell + entity components, never duplicate their logic
6. **Visual completeness**: The goal is that opening a screen story in Storybook shows a **recognizable page design**, not just raw text. If the visual result looks empty or unstyled, entity and shell stories need richer UI component references
7. **Section-level UI**: Screens may introduce additional slots for section-specific UI components (filter bars, sidebars, pagination) that don't belong to entity or shell layers
8. **Prerequisite-driven**: Checks for shell and entity components before generating, guides user to run them
9. **Provider**: Uses `designbook_design` as SDC provider
