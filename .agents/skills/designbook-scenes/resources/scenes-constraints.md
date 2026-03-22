# Scenes Constraints Reference

Examples for each constraint defined in `rules/scenes-constraints.md`.

## 1. Component values MUST use `provider:component` format

The SDC provider prefix is required on every `component:` value. The provider comes from `$DESIGNBOOK_SDC_PROVIDER` (set by workflow bootstrap).

```yaml
# ✅ Correct
- component: test_integration_drupal:header
  slots:
    logo:
      - component: test_integration_drupal:logo

# ❌ Wrong — missing provider prefix
- component: header
  slots:
    logo:
      - component: logo
```

This applies everywhere a `component:` key appears — top-level items, nested slot content, and inside `with:` blocks of scene references.

```yaml
# ✅ Correct — nested slots also use provider prefix
- component: test_integration_drupal:card
  props:
    variant: elevated
  slots:
    media:
      - component: test_integration_drupal:image
        props:
          src: https://picsum.photos/400/300
    content:
      - component: test_integration_drupal:heading
        slots:
          text: Card Title
```

## 2. No `type: element` in scenes

`type: element` is a story.yml concept for inline HTML elements. In scenes, use plain strings for text content.

```yaml
# ✅ Correct — plain string in slot
- component: test_integration_drupal:heading
  slots:
    text: Welcome to the Blog

# ❌ Wrong — type: element is only for *.story.yml files
- component: test_integration_drupal:heading
  slots:
    text:
      - type: element
        tag: span
        content: Welcome to the Blog
```

## 3. Shell scenes: inline all slots

Shell scenes must fully populate all sub-component slots. A bare `story: default` without slot content leaves navigation empty, logo missing, etc.

```yaml
# ✅ Correct — all header/footer slots inlined
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
                      src: /logo.svg
                navigation:
                  - component: test_integration_drupal:navigation
                    props:
                      items:
                        - label: Home
                          url: /
                        - label: Blog
                          url: /blog
                actions:
                  - component: test_integration_drupal:button
                    props:
                      label: Sign In
          content:
            - $content
          footer:
            - component: test_integration_drupal:footer
              slots:
                copyright: "&copy; 2026 Acme Inc."

# ❌ Wrong — story: default without inlined slots
scenes:
  - name: shell
    items:
      - component: test_integration_drupal:page
        slots:
          header:
            - component: test_integration_drupal:header
              story: default
          content:
            - $content
          footer:
            - component: test_integration_drupal:footer
              story: default
```
