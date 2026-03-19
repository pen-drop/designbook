---
params:
  product_name: ~
  nav_items: []
  cta_label: ~
  footer_links: []
  copyright: ~
  provider: ~
files:
  - $DESIGNBOOK_DIST/design-system/design-system.scenes.yml
---

# Create Shell Scene

Creates `design-system/design-system.scenes.yml` — the base layout scene that section scenes inherit from via `type: scene` + `ref: design-system:shell`.

## Output

```
$DESIGNBOOK_DIST/design-system/design-system.scenes.yml
```

## Format

The shell scene file has no `layout:` — it IS the layout. Section scenes inherit it via `ref: design-system:shell`.

```yaml
id: debo-design-system
title: Design System
description: [shell layout description]
status: planned
order: 0

group: "Designbook/Design System"
scenes:
  - name: shell
    items:
      - component: {{ provider }}:page
        slots:
          header:
            - component: {{ provider }}:header
              slots:
                logo:
                  - component: {{ provider }}:logo
                    props:
                      name: '{{ product_name }}'
                navigation:
                  - component: {{ provider }}:navigation
                    props:
                      variant: primary
                      items:
                        # All nav_items from dialog
                actions:
                  - component: {{ provider }}:button
                    props:
                      variant: default
                    slots:
                      text: '{{ cta_label }}'
          content: $content
          footer:
            - component: {{ provider }}:footer
              slots:
                navigation:
                  - component: {{ provider }}:navigation
                    props:
                      variant: footer
                      items:
                        # All footer_links from dialog
                copyright:
                  - component: {{ provider }}:copyright
                    props:
                      text: '{{ copyright }}'
```

## Full Example

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

## Key Rules

- **Explicit slots** — all sub-component slots must be fully inlined (logo, nav items, actions, copyright); never write `story: default` alone
- **`$content` injection point** — the `content:` slot must be `$content` (variable placeholder for section scenes)
- **Resolve provider** — `{{ provider }}` is the SDC namespace from `designbook.config.yml` (basename of `drupal.theme` with `-` → `_`)
- **`group:`** must be `"Designbook/Design System"`
