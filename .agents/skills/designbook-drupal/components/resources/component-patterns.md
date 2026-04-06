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

See [blueprints/navigation.md](../blueprints/navigation.md) for the full navigation blueprint including Drupal menu item structure, props, and Twig pattern.
