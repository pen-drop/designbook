# Rename .screen.yml → .scenes.yml

## Problem

The current `.screen.yml` format has two limitations:

1. **"Screen" is not descriptive** — it doesn't convey what the file does (composing components + entity data into page views)
2. **One screen per file** — forces many small files (`section-blog.detail.screen.yml`, `section-blog.listing.screen.yml`) instead of grouping related pages

## Proposal

Rename `.screen.yml` to **`.scenes.yml`** with multi-scene support and layout inheritance.

### Core Concepts

| Concept | Description |
|---------|-------------|
| **Scene** | A single page composition (components + entities) → becomes one Storybook story |
| **Layout** | A base scene that provides shared structure (shell). Scenes inherit and override slots |
| **`file:scene`** | Reference syntax: `"shell:minimal"` = `shell.scenes.yml`, scene named "minimal" |

### Format

```yaml
# shell/shell.scenes.yml — standalone, no layout inheritance
scenes:
  - name: default
    page:
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
    page:
      header:
        - component: header
          story: default
      content: []
```

```yaml
# sections/blog/blog.scenes.yml — inherits from shell
layout: "shell"                    # = shell:default (first scene)

scenes:
  - name: "Blog Detail"
    page:
      content:                     # overrides only content slot
        - entity: node.article
          view_mode: full
          record: 0

  - name: "Blog Listing"
    page:
      content:
        - component: heading
          props: { level: h1 }
          slots: { text: "Alle Artikel" }
        - entity: node.article
          view_mode: teaser
          records: [0, 1, 2]
```

### Layout Resolution

```
"shell"           → shell/shell.scenes.yml → scenes[0]
"shell:default"   → shell/shell.scenes.yml → scenes.find(name === "default")
"shell:minimal"   → shell/shell.scenes.yml → scenes.find(name === "minimal")
```

Slot merge: inherited scene provides all slots, section scene overrides only what it defines. Undefined slots (`header`, `footer`) remain from the layout.

### Consistent Reference Pattern

Same `source:name` convention already used elsewhere:

| Context | Syntax | Example |
|---------|--------|---------|
| Component reference | `provider:component` | `daisy_cms_daisyui:header` |
| Layout reference | `file:scene` | `shell:minimal` |

## Impact

### Files to change

| Area | Changes |
|------|---------|
| **Vite plugin** (`vite-plugin.ts`) | File detection `.screen.yml` → `.scenes.yml`, multi-scene expansion |
| **Parser** (`parser.ts`) | New `scenes[]` array format, layout resolution, slot merging |
| **Skills** | `designbook-screen` → rename to `designbook-scenes`, update format docs |
| **Workflows** | `debo-design-shell`, `debo-design-screen` → update references |
| **Storybook config** (`main.js`) | Stories glob `*.screen.yml` → `*.scenes.yml` |
| **Existing files** | Migrate all `.screen.yml` to `.scenes.yml` format |
| **Specs** | Update `shell-screen` and `screen-renderer` specs |

### Migration

Existing `.screen.yml` files can be mechanically transformed:

```yaml
# OLD: blog-detail.screen.yml
name: "Blog Detail"
layout:
  page:
    - component: page
      slots:
        header: [...]
        content: [...]
        footer: [...]

# NEW: blog.scenes.yml
layout: "shell"
scenes:
  - name: "Blog Detail"
    page:
      content: [...]           # header/footer inherited from shell
```

## Not in Scope

- Runtime layout switching (future)
- Nested layouts (layout extending another layout)
- Dynamic scene selection based on data
