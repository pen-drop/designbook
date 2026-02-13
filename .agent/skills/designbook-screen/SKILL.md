---
name: Designbook Screen
description: Generates screen design components that compose shell + entity into full page views. Load this skill when DESIGNBOOK_TECHNOLOGY is drupal.
---

# Designbook Screen

This skill generates **screen design components** that compose shell (header/footer) and entity components into full page views. Each screen represents one page within a product section.

Screen components are the **top-level composition layer** — they are structural wrappers with three slots: header, content, footer. The content slot references an entity design component in a specific view mode. Because entity and shell components already reference **real UI components** in their stories, the composed screen renders as a **complete visual design** in Storybook.

> **Visual design flow:** Screen → composes Shell + Entity → each references UI components → produces a real page preview.

> ⛔ **NAMING CONVENTION**: All files follow **kebab-case** and the directory name = file base name. Example: `dashboard-overview/section-news-dashboard-overview.component.yml`.

## Prerequisites

1. This skill is **technology-specific** and should only be used when `DESIGNBOOK_TECHNOLOGY` is set to `drupal` in `designbook.config.yml`.
2. Load the configuration using the `designbook-configuration` skill to get `DESIGNBOOK_DIST`.
3. Shell components must exist (run `designbook-shell` first):
   - `$DESIGNBOOK_DIST/design/shell/header/shell-header.component.yml`
   - `$DESIGNBOOK_DIST/design/shell/footer/shell-footer.component.yml`
4. Entity components must exist for referenced entities (run `designbook-entity` first).
5. Screen designs must exist: `$DESIGNBOOK_DIST/sections/[section-id]/screen-designs.md`

## Input Parameters

Expected as JSON object:

```json
{
  "section-id": "news"
}
```

**Optional fields:**
- `section-id` (string). When provided, only generates screen components for that section. When omitted, generates screens for all sections that have `screen-designs.md`.

## Output Structure

```
$DESIGNBOOK_DIST/
└── design/
    └── sections/
        └── [section-id]/
            ├── [page-name]/
            │   ├── section-[sectionid]-[pagename].component.yml
            │   ├── section-[sectionid]-[pagename].story.yml
            │   └── section-[sectionid]-[pagename].twig
            └── [another-page]/
                ├── section-[sectionid]-[anotherpagename].component.yml
                ├── section-[sectionid]-[anotherpagename].story.yml
                └── section-[sectionid]-[anotherpagename].twig
```

**Example:** Section "news" with pages "article-list" and "article-detail":

```
design/sections/news/
├── article-list/
│   ├── section-news-article-list.component.yml
│   ├── section-news-article-list.story.yml
│   └── section-news-article-list.twig
└── article-detail/
    ├── section-news-article-detail.component.yml
    ├── section-news-article-detail.story.yml
    └── section-news-article-detail.twig
```

> **Naming rule:** Directory name is the page name (kebab-case). File base name = `section-[sectionid]-[pagename]` (kebab-case). All files in the directory share the same base name.

## Execution Steps

### Step 1: Check Prerequisites

Verify shell components exist:

```bash
ls $DESIGNBOOK_DIST/design/shell/header/shell-header.component.yml 2>/dev/null
ls $DESIGNBOOK_DIST/design/shell/footer/shell-footer.component.yml 2>/dev/null
```

**If missing:**
> "❌ Shell components not found. Run `designbook-shell` first."

Stop here.

### Step 2: Discover Sections

If `section-id` is provided, use only that section. Otherwise, scan for all sections with screen designs:

```bash
find $DESIGNBOOK_DIST/sections/ -name "screen-designs.md" | sort
```

**If no screen designs found:**
> "❌ No screen-designs.md found. Run `/design-screen` first to create screen designs."

Stop here.

### Step 3: Parse Screen Designs

For each section's `screen-designs.md`, extract page definitions. Each page should specify:
- **Page name** — kebab-case identifier (e.g., "article-list", "article-detail")
- **Entity reference** — which entity type/bundle is shown (e.g., "node/article")
- **View mode** — which view mode to use (e.g., "full", "teaser")

> **Parsing strategy:** Look for structured headings or sections in screen-designs.md that define individual pages. The markdown format should have clear page boundaries.

**If parsing fails for a page:**
> "⚠️ Could not parse page definition for `[section-id]/[page]`. Skipping."

Continue with remaining pages.

### Step 4: Check Entity Prerequisites

For each entity referenced in the screen designs, verify the entity component exists:

```bash
ls $DESIGNBOOK_DIST/design/entity/[entity_type]/[bundle]/entity-[entitytype]-[bundle].component.yml 2>/dev/null
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
2. If missing, create them using `designbook-drupal-components` before generating the screen component.
3. Add extra slots to the screen component for these elements (beyond just header/content/footer).

Present findings to the user:

> "The **[page-name]** screen design includes elements beyond the entity and shell:
>
> | Element | UI Component | Status |
> |---------|-------------|--------|
> | Filter bar | `[ui_provider]:filter-bar` | 🆕 NEW — needs creation |
> | Pagination | `[ui_provider]:pagination` | ✅ exists |
>
> I'll add these as extra slots in the screen component. Shall I proceed?"

### Step 5: Generate Screen Components

For each page in each section:

**5.1 Determine component name:** `section-[sectionid]-[pagename]` (kebab-case)
- Section "news", page "article-list" → `section-news-article-list`
- Section "news", page "article-detail" → `section-news-article-detail`

The `name:` field inside `.component.yml` uses **snake_case**: `section_news_article_list`.
The **directory and file names** use **kebab-case**: `section-news-article-list.*`.

**5.2 Build component definition:**

```json
{
  "name": "section_[sectionid]_[pagename]",
  "description": "Screen: [Section Title] — [Page Title]. Composes shell header + entity + shell footer.",
  "status": "experimental",
  "provider": "designbook_design",
  "slots": [
    {
      "name": "header",
      "title": "Header",
      "description": "Shell header component"
    },
    {
      "name": "content",
      "title": "Content",
      "description": "Main content area — entity component"
    },
    {
      "name": "footer",
      "title": "Footer",
      "description": "Shell footer component"
    }
  ],
  "outputDir": "$DESIGNBOOK_DIST/design/sections/[section-id]/[page-name]"
}
```

**5.3 Generate story (flat format, component references only):**

```yaml
# section-[sectionid]-[pagename].story.yml
name: Preview
slots:
  header:
    - type: component
      component: 'designbook_design:shell-header'
  content:
    - type: component
      component: 'designbook_design:entity-[entitytype]-[bundle]'
  footer:
    - type: component
      component: 'designbook_design:shell-footer'
```

> **Note**: Stories use the **flat format** (top-level `name`, `slots`, `props`). No `stories:` wrapper.

**5.4 Delegate** to `designbook-drupal-components` with this definition.

### Step 6: Verify Output

Check that screen components were created for each section/page:

```bash
find $DESIGNBOOK_DIST/design/sections/ -name "*.component.yml" | sort
```

**If successful:**
> "✅ **Screen components created!**
>
> | Section | Page | Component | Entity |
> |---------|------|-----------|--------|
> | News | Article List | `section-news-article-list` | node/article (teaser) |
> | News | Article Detail | `section-news-article-detail` | node/article (full) |
>
> Open Storybook to see the full page compositions under Sections/* in the sidebar.
>
> **Tip:** To regenerate after changing screen designs, run this skill again."

## Error Handling

- **Missing shell components**: Report error, suggest running `designbook-shell`
- **Missing entity components**: Report error, list which entities are missing, suggest running `designbook-entity`
- **Missing screen-designs.md**: Report error, suggest running `/design-screen`
- **Unparseable screen design**: Warn, skip that page, continue with others
- **File write fails**: Report which screen/file failed and why
- **designbook-drupal-components fails**: Pass through the error message

## Design Principles

1. **Consistent naming**: Directory name = file base name. Always kebab-case. `section-news-article-list/section-news-article-list.*`
2. **Structural templates, composed design**: Screen Twig templates contain `{{ header }}{{ content }}{{ footer }}` — nothing else. But the composed story renders a **complete visual page** because shell and entity stories already reference real UI components
3. **No inline markup**: Screen stories use **only `type: component`** references — composing shell and entity design components
4. **Composition**: Screens compose existing shell + entity components, never duplicate their logic
5. **Visual completeness**: The goal is that opening a screen story in Storybook shows a **recognizable page design**, not just raw text. If the visual result looks empty or unstyled, entity and shell stories need richer UI component references
6. **Section-level UI**: Screens may introduce additional slots for section-specific UI components (filter bars, sidebars, pagination) that don't belong to entity or shell layers
7. **Prerequisite-driven**: Checks for shell and entity components before generating, guides user to run them
8. **Multi-page**: One section can have multiple pages, each with its own screen component
9. **Delegated**: Actual file creation is handled by `designbook-drupal-components`
10. **Provider**: Uses `designbook_design` as SDC provider
