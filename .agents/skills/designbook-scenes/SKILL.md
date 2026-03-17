---
name: Designbook Scenes
description: Generates scene files that compose UI components + entity data into full page views. Uses *.scenes.yml format with items arrays and scene references.
---

# Designbook Scenes

> Creates `*.scenes.yml` files that compose UI components and entity data into full page views. Each file contains one or more **scenes** — each scene becomes a Storybook story.

> [!IMPORTANT]
> **Multiple scenes per file.** Group related pages together. Each scene becomes its own Storybook story.
>
> | File | Scenes |
> |------|---------|
> | `design-system/design-system.scenes.yml` | `shell`, `minimal` |
> | `sections/blog/blog.section.scenes.yml` | `Blog Detail`, `Blog Listing` |

## Prerequisites

1. **Data model** (schema only): `$DESIGNBOOK_DIST/data-model.yml`
2. **View mode expressions**: `$DESIGNBOOK_DIST/view-modes/{entity_type}.{bundle}.{view_mode}.jsonata` — see `designbook-view-modes` skill
3. **Sample data** per section: `$DESIGNBOOK_DIST/sections/{section}/data.yml`
4. **UI components** must exist (heading, figure, text-block, etc.)
5. **Page component** must exist with `header`, `content`, `footer` slots — see `debo-design-shell` workflow
6. **Header/Footer components** must exist — see `debo-design-shell` workflow

## Output Structure

```
$DESIGNBOOK_DIST/
├── design-system/
│   ├── design-tokens.yml              # Design tokens
│   └── design-system.scenes.yml       # Shell layout (base for inheritance)
└── sections/
    └── blog/
        ├── data.yml
        └── blog.section.scenes.yml    # Section metadata + all blog scenes
```

## The `*.scenes.yml` Format

> [!CAUTION]
> **`component:` values MUST always use `provider:component` format.**
> Write `test_integration_drupal:header`, NEVER just `header`.
> The renderer will throw `Invalid SDC component reference` if the provider prefix is missing.
> Resolve `$DESIGNBOOK_SDC_PROVIDER` from `@designbook-configuration` at generation time.

### File-level fields

| Field | Required | Description |
|-------|----------|-------------|
| `group` | ✅ | Storybook story group (e.g. `"Designbook/Design System"`). Falls back to `name` if missing. |
| `scenes` | ✅ | Array of scene definitions |
| `id` | ❌ | Section/shell identifier (for Designbook overview pages) |
| `title` | ❌ | Human-readable title (for overview page) |
| `description` | ❌ | Section description (for overview page) |
| `status` | ❌ | Section status: `planned`, `in-progress`, `done` |
| `order` | ❌ | Display order in Storybook sidebar |

> **`group` vs `name`**: Use `group` as the canonical field. `name` works as a fallback but `group` is preferred.

### Scene-level fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | ✅ | Display name in Storybook sidebar |
| `items` | ✅ | Flat array of scene entries (`SceneNode[]`) |
| `section` | ❌ | Section ID for data loading |
| `docs` | ❌ | Documentation string |

### Shell Scene File (no inheritance)

The design system shell wraps everything in a `page` component. Slots that section scenes fill in are declared as `$variable` placeholders. Unresolved variables render as a visible grey placeholder box in Storybook.

```yaml
# design-system/design-system.scenes.yml
id: debo-design-system
title: Design System
description: Top-navigation layout with logo, main nav, and footer.
status: planned
order: 0

group: "Designbook/Design System"
scenes:
  - name: shell
    items:
      - component: test_integration_drupal:page
        slots:
          header:
            - component: test_integration_drupal:header
              story: default
          content: $content        # injection point — filled by section scenes
          footer:
            - component: test_integration_drupal:footer
              story: default

  - name: minimal
    items:
      - component: test_integration_drupal:page
        slots:
          header:
            - component: test_integration_drupal:header
              story: default
          content: $content
```

### Section Scene File with Shell Inheritance

Section scenes inherit the shell by referencing it as a `type: scene` entry in `items`. The `with:` key fills the shell's `$variable` injection points.

```yaml
# sections/blog/blog.section.scenes.yml
id: blog
title: Blog
description: Artikel und News rund ums Thema.
status: planned
order: 2

group: "Designbook/Sections/Blog"
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

  - name: "Blog Listing"
    items:
      - type: scene
        ref: design-system:shell
        with:
          content:
            - component: test_integration_drupal:heading
              props: { level: h1 }
              slots: { text: "Alle Artikel" }
            - entity: node.article
              view_mode: teaser
              records: [0, 1, 2]
```

> [!IMPORTANT]
> **Section metadata is part of the scenes file.** The `id`, `title`, `description`, `status`, and `order` fields are for Designbook overview/navigation. There is NO separate section spec file.

> [!IMPORTANT]
> **Scene composition via `type: scene` + `with:`.** The `with:` values are substituted into `$variable` placeholders in the referenced scene's template before building. Only slots declared as `$variable` in the shell can be filled. Unresolved variables render as a visible grey placeholder box in Storybook.

### Scene Reference Syntax

```yaml
items:
  - type: scene
    ref: "design-system:shell"      # <source>:<sceneName>
    with:                            # fills $variable placeholders in the template
      content:
        - entity: node.article
          view_mode: full
```

The resolver scans `*.scenes.yml` files in the referenced directory:

```
ref: "design-system"        → design-system/*.scenes.yml → first scene (scenes[0])
ref: "design-system:shell"  → design-system/*.scenes.yml → scene named "shell"
ref: "design-system:minimal"→ design-system/*.scenes.yml → scene named "minimal"
```

### Component Entry

Reference a UI component directly with props and slot content:

```yaml
- component: test_integration_drupal:heading
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
  view_mode: full            # Which view mode to use
  record: 0                  # Sample data record index (default: 0)
```

### Records Shorthand

For listing pages with multiple items, use `records` instead of repeating entries:

```yaml
- entity: node.article
  view_mode: teaser
  records: [0, 1, 2]         # Expands to 3 separate entries
```

### Config Entry

Reference a list config from `data-model.yml`:

```yaml
- config: list.recent_articles        # "<config_type>.<config_name>"
  view_mode: default                   # Optional, defaults to "default"
```

## Execution Steps

### Step 1: Check Prerequisites

```bash
ls $DESIGNBOOK_DIST/data-model.yml 2>/dev/null
ls $DESIGNBOOK_DIST/sections/$SECTION_ID/data.yml 2>/dev/null
```

Check that `page`, `header`, and `footer` components exist. If not, tell the user to run `/debo-design-shell` first.

### Step 2: Parse Section Metadata

Read the section's `{section}.section.scenes.yml` (if it exists) and extract section metadata and existing scenes.
Identify for each scene page:
- **Page name** (kebab-case: `listing`, `detail`)
- **Entity type/bundle** (e.g. `node.article`)
- **View mode** (`full`, `teaser`)
- **Extra UI elements** (filter bars, pagination, sidebars)

### Step 3: Check for Section-Level UI Components

Review scene designs for elements beyond entity + shell:

| Element | Example | Action |
|---------|---------|--------|
| Filter bar | Listing page filter | Create UI component first |
| Pagination | Multi-page listing | Create UI component first |
| Sidebar | Related content | Add as extra content |

### Step 4: Create Scenes File

Create `sections/{section}/{section}.section.scenes.yml` with section metadata and all pages as scenes.

```yaml
id: blog
title: Blog
description: Artikel und News rund ums Thema.
status: planned
order: 2

group: "Designbook/Sections/Blog"
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

  - name: "Blog Listing"
    items:
      - type: scene
        ref: design-system:shell
        with:
          content:
            - component: test_integration_drupal:heading
              props: { level: h1 }
              slots: { text: "Alle Artikel" }
            - entity: node.article
              view_mode: teaser
              records: [0, 1, 2]
```

> [!TIP]
> **No need to repeat header/footer.** With `type: scene, ref: design-system:shell`, the header and footer are inherited from the shell scene. Only define what goes in the `$content` slot via `with:`.

### Step 5: Verify in Storybook

Open Storybook — each scene appears as its own story in the sidebar. Each should render the full page layout (header + content + footer) via the page component.

## Component Reference Format

> [!IMPORTANT]
> **Every component reference must use `provider:component` format.**
> Example: `test_integration_drupal:heading`, not just `heading`.
> The renderer validates this format and throws an error if it's wrong.

The provider is the SDC namespace from the component's `.component.yml` → `provider:` field.

## Error Handling

| Error | Fix |
|-------|-----|
| `Invalid SDC component reference` | Use `provider:component` format (e.g. `test_integration_drupal:heading`) |
| Component not found | Create the UI component first |
| Page component missing | Run `/debo-design-shell` to create page/header/footer |
| Entity not in data model | Add entity to `data-model.yml` |
| View mode not defined | Add view mode mapping to data model |
| Record not found | Add more records to `data.yml` |
| No data.yml | Create sample data for this section |
| Scene not found | Check `ref` format (`"source:sceneName"`) |

## Workflow Tracking

> ⛔ **Use `@designbook-workflow/steps/`** for tracking: load `create` → `update` (in-progress) → `add-files` → `validate` → `update` (done).

Produced file for `--files`: `sections/<section-id>/<scene-id>.scenes.yml`
