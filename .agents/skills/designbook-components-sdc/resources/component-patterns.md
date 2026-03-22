# Component Patterns & Heuristics

Reference for understanding and parsing component definitions from natural language descriptions.

## Component Name Detection

Look for explicit component types:

- **Common types:** card, button, hero, modal, accordion, alert, badge, chip, stat, figure, pagination, empty-state, search-filter, sidebar, navigation
- **Inference fallback:** derive from structure (e.g., "box with title and text" → `content-box`)

## Slot Detection Keywords

| User says                                       | Maps to slot      |
| ----------------------------------------------- | ----------------- |
| image, picture, photo, graphic, avatar          | `image` / `media` |
| title, headline, heading                        | `title`           |
| preheadline, kicker, eyebrow                    | `preheadline`     |
| subheading, subtitle                            | `subtitle`        |
| text, body, description, content, message, copy | `body`            |
| button, CTA, action, link                       | `action`          |
| icon                                            | `icon`            |
| header, footer, sidebar                         | structural slots  |

**Ordering:** Slots should be listed in visual/reading order (top → bottom, left → right), matching the sequence described by the user.

## Variant Detection

- **Style modifiers:** "can be X or Y", "X, Y, or Z style", "types: X, Y"
- **Common patterns:**
  - `default` / `outline` / `ghost` (buttons)
  - `info` / `warning` / `error` / `success` (alerts)
  - `vertical` / `horizontal` (cards)
  - `small` / `medium` / `large` (sizing)

## Prop Detection

- **Behavioral:** disabled, loading, expanded, collapsed, active
- **Interactive:** clickable, toggleable, collapsible
- **Size/Scale:** small, medium, large, compact, full-width
- **State:** enabled/disabled, open/closed, visible/hidden
- **From variants:** "can be info or warning" → `variant` prop with enum
- **Character limits:** "150 character text" → note in description, don't create prop

## Navigation Components

Navigation components render Drupal menu trees. Two variants exist: `main` (primary site navigation) and `footer` (footer link groups).

### Drupal Menu Item Structure

Navigation props use Drupal's `MenuLinkTreeElement` structure. Each item has:

```yaml
items:              # array of menu items
  - title: string   # link text
    url: string     # href value
    in_active_trail: boolean  # true if this item or a child is the current page
    below:          # nested child items (same structure, recursive)
      - title: string
        url: string
        in_active_trail: boolean
        below: []
```

> **Key rules:**
> - Use `items` (not `links`, `menu_items`, or `nav_items`) — matches Drupal's `menu.html.twig`
> - Use `in_active_trail` (not `active`) — Drupal distinguishes between the active page and its ancestor trail
> - Use `below` for nested children (not `children` or `submenu`)
> - `url` is a string (Drupal's `Url::toString()` output), not an object

### Navigation Component Definition

```yaml
name: Navigation
group: Navigation
variants:
  - { id: main, title: Main Navigation }
  - { id: footer, title: Footer Navigation }
props:
  - name: variant
    type: string
    enum: [main, footer]
    default: main
  - name: items
    type: array
    description: "Menu tree — array of Drupal MenuLinkTreeElement items"
```

### Navigation Story Structure

**Main navigation** (`navigation.main.story.yml`):
```yaml
name: Main
props:
  variant: main
  items:
    - title: Gallery
      url: /gallery
      in_active_trail: true
      below: []
    - title: Config
      url: /config
      in_active_trail: false
      below: []
    - title: Orders
      url: /orders
      in_active_trail: false
      below: []
```

**Footer navigation** (`navigation.footer.story.yml`):
```yaml
name: Footer
props:
  variant: footer
  items:
    - title: System Archive
      url: /archive
      in_active_trail: false
      below: []
    - title: Lab Reports
      url: /reports
      in_active_trail: false
      below: []
```

### Twig Pattern

```twig
{% macro menu_links(items, variant) %}
  {% for item in items %}
    <a href="{{ item.url }}"
       class="{{ item.in_active_trail ? 'active-trail' : '' }}">
      {{ item.title }}
    </a>
    {% if item.below is iterable and item.below|length > 0 %}
      {{ _self.menu_links(item.below, variant) }}
    {% endif %}
  {% endfor %}
{% endmacro %}
```

> Navigation components should support recursive `below` nesting but shell stories typically use a flat list (1 level).
