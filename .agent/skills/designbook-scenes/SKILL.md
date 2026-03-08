---
name: Designbook Scenes
description: Generates scene files that compose UI components + entity data into full page views. Uses *.scenes.yml format with layout inheritance and multi-scene support.
---

# Designbook Scenes

> Creates `*.scenes.yml` files that compose UI components and entity data into full page views. Each file contains one or more **scenes** — each scene becomes a Storybook story.

> [!IMPORTANT]
> **Multiple scenes per file.** Group related pages together. Each scene becomes its own Storybook story.
>
> | File | Scenes |
> |------|--------|
> | `shell/shell.scenes.yml` | `default`, `minimal` |
> | `sections/blog/blog.scenes.yml` | `Blog Detail`, `Blog Listing` |

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
├── shell/
│   └── shell.scenes.yml          # Shell layout (base for inheritance)
└── sections/
    └── blog/
        ├── data.yml
        ├── spec.section.yml
        └── blog.scenes.yml       # All blog scenes in one file
```

## The `*.scenes.yml` Format

### Standalone Scene File (no layout inheritance)

Used for the shell itself — defines all layout slots:

```yaml
# shell/shell.scenes.yml
name: "Application Shell"
scenes:
  - name: default
    layout:
      header:
        - component: header
          story: default
      content:
        - component: hero
          story: default
      footer:
        - component: footer
          story: default

  - name: minimal
    layout:
      header:
        - component: header
          story: default
      content: []
```

### Scene File with Layout Inheritance

Used for section scenes — inherits shell and overrides only the `content` slot:

```yaml
# sections/blog/blog.scenes.yml
name: "Designbook/Sections/Blog"
layout: "shell"

scenes:
  - name: "Blog Detail"
    layout:
      content:
        - entity: node.article
          view_mode: full
          record: 0

  - name: "Blog Listing"
    layout:
      content:
        - component: heading
          props: { level: h1 }
          slots: { text: "Alle Artikel" }
        - entity: node.article
          view_mode: teaser
          records: [0, 1, 2]
```

> [!IMPORTANT]
> **Layout inheritance merges slots.** The inherited scene provides all layout slots (`header`, `content`, `footer`). The section scene overrides only the slots it defines. Undefined slots remain from the layout.

### Layout Reference Syntax

```
layout: "shell"            → shell/shell.scenes.yml → first scene (scenes[0])
layout: "shell:default"    → shell/shell.scenes.yml → scene named "default"
layout: "shell:minimal"    → shell/shell.scenes.yml → scene named "minimal"
```

Same `source:name` convention used for component references (`provider:component`).

### Top-level Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | ✅ | Display name for the Storybook group (e.g. `"Application Shell"`, `"Blog"`) |
| `layout` | ❌ | Layout scene to inherit from (`"file"` or `"file:scene"`) |
| `scenes` | ✅ | Array of scene definitions |

### Scene Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | ✅ | Display name in Storybook sidebar |
| `layout` | ✅ | Map of layout slot names → arrays of entries |

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

Check that `page`, `header`, and `footer` components exist. If not, tell the user to run `/debo-design-shell` first.

### Step 2: Parse Section Spec

Read the `screen` key from `spec.section.yml` (if it exists) and extract for each page:
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

Create `sections/{section}/{section}.scenes.yml` with all section pages as scenes.

```yaml
name: "Designbook/Sections/Blog"
layout: "shell"

scenes:
  - name: "Blog Detail"
    layout:
      content:
        - entity: node.article
          view_mode: full
          record: 0

  - name: "Blog Listing"
    layout:
      content:
        - component: heading
          props: { level: h1 }
          slots: { text: "Alle Artikel" }
        - entity: node.article
          view_mode: teaser
          records: [0, 1, 2]
```

> [!TIP]
> **No need to repeat header/footer.** With `layout: "shell"`, the header and footer are inherited automatically. Only define the `content` slot.

### Step 5: Verify in Storybook

Open Storybook — each scene appears as its own story in the sidebar. Each should render the full page layout (header + content + footer) via layout inheritance.

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
| Layout scene not found | Check layout reference (`"file:scene"` syntax) |
