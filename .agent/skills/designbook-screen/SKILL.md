---
name: Designbook Screen
description: Generates screen design components that compose shell + entity into full page views. Load this skill when DESIGNBOOK_TECHNOLOGY is drupal.
---

# Designbook Screen

This skill generates **screen design components** that compose shell (header/footer) and entity components into full page views. Each screen represents one page within a product section.

Screen components are the **top-level composition layer** — they are structural wrappers with three slots: header, content, footer. The content slot references an entity design component in a specific view mode. Because entity and shell components already reference **real UI components** in their stories, the composed screen renders as a **complete visual design** in Storybook.

> **Visual design flow:** Screen → composes Shell + Entity → each references UI components → produces a real page preview.

## Section Context & Data Resolution

Screen components **must** declare `designbook.section` in their `.component.yml`. This metadata tells the system which section's sample data (`data.json`) to load into `globalThis.__designbook_store`.

When the screen is rendered in Storybook:
1. The addon reads `designbook.section` from the component metadata
2. It loads `sections/[section-id]/data.json` into `globalThis.__designbook_store`
3. Entity stories within the screen use `type: ref` with `path:` notation (e.g., `path: node.article.title`)
4. The `refRenderer` resolves these paths against the loaded store

```yaml
# In .component.yml — MANDATORY for data binding
designbook:
  section: blog   # ← loads sections/blog/data.json into the store
```

> ⛔ **Without `designbook.section`**, all `type: ref` paths in entity stories will resolve to `[missing: ...]` because no data is loaded.

> ⛔ **NAMING CONVENTION**: All files follow **kebab-case** and the directory name = file base name. Example: `dashboard-overview/section-news-dashboard-overview.component.yml`.

## Prerequisites

1. This skill is **technology-specific** and should only be used when `DESIGNBOOK_TECHNOLOGY` is set to `drupal` in `designbook.config.yml`.
2. Load the configuration using the `designbook-configuration` skill to get `DESIGNBOOK_DIST`.
3. Shell components must exist (run `designbook-shell` first):
   - `$DESIGNBOOK_DIST/components/shell-header/shell-header.component.yml`
   - `$DESIGNBOOK_DIST/components/shell-footer/shell-footer.component.yml`
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
└── components/
    ├── section-news-article-list/
    │   ├── section-news-article-list.component.yml
    │   ├── section-news-article-list.story.yml
    │   └── section-news-article-list.twig
    └── section-news-article-detail/
        ├── section-news-article-detail.component.yml
        ├── section-news-article-detail.story.yml
        └── section-news-article-detail.twig
```

> **Naming rule:** Directory name = file base name = `section-[sectionid]-[pagename]` (kebab-case). All files in the directory share the same base name.

## Execution Steps

### Step 1: Check Prerequisites

Verify shell components exist:

```bash
ls $DESIGNBOOK_DIST/components/shell-header/shell-header.component.yml 2>/dev/null
ls $DESIGNBOOK_DIST/components/shell-footer/shell-footer.component.yml 2>/dev/null
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

The **view mode** determines the entity story that the screen composes. Entity stories are named after their view mode machine name (e.g., `full`, `teaser`). The screen story references the entity using `story: [viewmode]`.

View modes can also be derived from the **data model** (`data-model.json`) if the entity defines `view_modes`. Common view modes:

| View Mode | Screen Type | Entity Story Name |
|-----------|------------|-------------------|
| `full` | Detail page | `full` |
| `teaser` | List page / card | `teaser` |
| `search_result` | Search results | `search_result` |

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
  "group": "Designbook/Screen/[SECTION_ID]",
  "status": "experimental",
  "provider": "designbook_design",
  "designbook": {
    "section": "[sectionid]"
  },
  "thirdPartySettings": {
    "sdcStorybook": {
      "disableBasicStory": true,
      "tags": ["!autodocs"]
    }
  },
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
  "outputDir": "$DESIGNBOOK_DIST/components/section-[sectionid]-[pagename]"
}
```

> **`group`**: Replace `[SECTION_ID]` with the actual section ID in PascalCase (e.g., `Designbook/Screen/Blog`). This groups all screen pages of one section together in the Storybook sidebar.
>
> ⛔ **`designbook.section` is MANDATORY**: The section ID (e.g., `blog`). This is the key that tells the addon which `sections/[sectionid]/data.json` to load into `globalThis.__designbook_store`. Without it, all `{type: ref, path: ...}` references in entity stories will not resolve.

The resulting `.component.yml` looks like this:

```yaml
# section-blog-blog-detail.component.yml
$schema: "https://git.drupalcode.org/project/drupal/-/raw/HEAD/core/assets/schemas/v1/metadata.schema.json"
name: section_blog_blog_detail
status: experimental
description: "Screen: Blog — BlogDetail. Composes shell header + article entity + shell footer into a full page view."
group: Designbook/Screen/Blog
provider: designbook_design
designbook:
  section: blog
thirdPartySettings:
  sdcStorybook:
    disableBasicStory: true
    tags: 
      - "!autodocs"
slots:
  header:
    title: "Header"
    description: "Shell header component"
  content:
    title: "Content"
    description: "Main content area — article entity component"
  footer:
    title: "Footer"
    description: "Shell footer component"
```

**5.3 Generate story (flat format, component references only):**

The story name comes from the **view mode** of the page (machine name, lowercase). For a detail page using view mode `full`, the story is named `full`. The entity component reference includes `story:` to select the matching entity story.

```yaml
# section-[sectionid]-[pagename].story.yml
name: '[viewmode]'
slots:
  header:
    - type: component
      component: 'designbook_design:shell-header'
      story: default
  content:
    - type: component
      component: 'designbook_design:entity-[entitytype]-[bundle]'
      story: '[viewmode]'
  footer:
    - type: component
      component: 'designbook_design:shell-footer'
      story: default
```

**View mode → Story name mapping:**

| View Mode | Story Name |
|-----------|------------|
| `full` | `full` |
| `teaser` | `teaser` |
| `search_result` | `search_result` |

> **Note**: Stories use the **flat format** (top-level `name`, `slots`, `props`). No `stories:` wrapper.
> 
> **`story:` key**: Required on all component references. This tells the SDC addon which story to render for the composed component. Shell components use `story: default`, entity components use the view mode machine name.

**5.4 Delegate** to `designbook-drupal-components` with this definition.

### Step 6: Verify Output

Check that screen components were created for each section/page:

```bash
find $DESIGNBOOK_DIST/components/section-* -name "*.component.yml" | sort
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

1. **Consistent naming**: Directory name = file base name. Always kebab-case. `section-news-article-list/section-news-article-list.*`. Group key: `Designbook/Screen/[SECTION_ID]`
2. **Structural templates, composed design**: Screen Twig templates contain `{{ header }}{{ content }}{{ footer }}` — nothing else. But the composed story renders a **complete visual page** because shell and entity stories already reference real UI components
3. **No inline markup**: Screen stories use **only `type: component`** references — composing shell and entity design components
4. **Composition**: Screens compose existing shell + entity components, never duplicate their logic
5. **Visual completeness**: The goal is that opening a screen story in Storybook shows a **recognizable page design**, not just raw text. If the visual result looks empty or unstyled, entity and shell stories need richer UI component references
6. **Section-level UI**: Screens may introduce additional slots for section-specific UI components (filter bars, sidebars, pagination) that don't belong to entity or shell layers
7. **Prerequisite-driven**: Checks for shell and entity components before generating, guides user to run them
8. **Multi-page**: One section can have multiple pages, each with its own screen component
9. **Delegated**: Actual file creation is handled by `designbook-drupal-components`
10. **Provider**: Uses `designbook_design` as SDC provider
