# Scene Reference

## File-level Fields

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

## Scene-level Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | ✅ | Display name in Storybook sidebar |
| `items` | ✅ | Flat array of scene entries (`SceneNode[]`) |
| `section` | ❌ | Section ID for data loading |
| `docs` | ❌ | Documentation string |

## Entry Types

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

### Scene Reference

Section scenes inherit the shell via `type: scene`. The `with:` key fills `$variable` placeholders in the referenced scene:

```yaml
- type: scene
  ref: "design-system:shell"      # <source>:<sceneName>
  with:                            # fills $variable placeholders in the template
    content:
      - entity: node.article
        view_mode: full
```

The resolver scans `*.scenes.yml` files in the referenced directory:

```
ref: "design-system"         → design-system/*.scenes.yml → first scene (scenes[0])
ref: "design-system:shell"   → design-system/*.scenes.yml → scene named "shell"
ref: "design-system:minimal" → design-system/*.scenes.yml → scene named "minimal"
```

Unresolved `$variable` placeholders render as a visible grey placeholder box in Storybook.

---

## Shell Scene Example

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
              slots:
                logo:
                  - component: test_integration_drupal:logo
                    props:
                      name: 'My Product'
                navigation:
                  - component: test_integration_drupal:navigation
                    props:
                      variant: primary
                      items:
                        - { label: 'Blog', url: '/blog' }
                        - { label: 'About', url: '/about' }
                actions:
                  - component: test_integration_drupal:button
                    props:
                      variant: default
                    slots:
                      text: 'Contact'
          content: $content        # injection point — filled by section scenes
          footer:
            - component: test_integration_drupal:footer
              slots:
                navigation:
                  - component: test_integration_drupal:navigation
                    props:
                      variant: footer
                      items:
                        - { label: 'Privacy', url: '/privacy' }
                        - { label: 'Terms', url: '/terms' }
                        - { label: 'Imprint', url: '/imprint' }
                copyright:
                  - component: test_integration_drupal:copyright
                    props:
                      text: '© 2026 My Product. All rights reserved.'

  - name: minimal
    items:
      - component: test_integration_drupal:page
        slots:
          header:
            - component: test_integration_drupal:header
              slots:
                logo:
                  - component: test_integration_drupal:logo
                    props:
                      name: 'My Product'
                navigation:
                  - component: test_integration_drupal:navigation
                    props:
                      variant: primary
                      items:
                        - { label: 'Blog', url: '/blog' }
                        - { label: 'About', url: '/about' }
          content: $content
```

## Section Scene Example

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
