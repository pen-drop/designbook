# Component Patterns & Heuristics

Reference for understanding and parsing component definitions from natural language descriptions.

## Component Name Detection

Look for explicit component types:

- **Common types:** card, button, hero, modal, accordion, alert, badge, chip, stat, figure, pagination, empty-state, search-filter, sidebar
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

## Parsing Examples

### Simple Card

**Input:** _"A card with an image on top, preheadline and headline, after the headline comes a 150 character text and below that a button"_

```yaml
name: Card
slots:
  - { name: image, title: Image, description: "Visual at the top" }
  - {
      name: preheadline,
      title: Preheadline,
      description: "Small text above headline",
    }
  - { name: headline, title: Headline, description: "Main title" }
  - { name: body, title: Body Text, description: "~150 characters" }
  - { name: action, title: Action, description: "CTA button" }
variants: [{ id: default, title: Default }]
props: []
```

### Alert with Variants

**Input:** _"An alert box that can be info, warning, or error, with an icon on the left and a message"_

```yaml
name: Alert
slots:
  - { name: icon, title: Icon }
  - { name: message, title: Message }
variants:
  - { id: info, title: Info }
  - { id: warning, title: Warning }
  - { id: error, title: Error }
props:
  - { name: variant, type: string, enum: [info, warning, error], default: info }
```

### Hero Section

**Input:** _"A hero section with a full-width background image, large heading, subheading, and two buttons side by side"_

```yaml
name: Hero
slots:
  - { name: background_image, title: Background Image }
  - { name: heading, title: Heading }
  - { name: subheading, title: Subheading }
  - { name: primary_action, title: Primary Action }
  - { name: secondary_action, title: Secondary Action }
variants: [{ id: default, title: Default }]
props: []
```

### Button with States

**Input:** _"A button that can be default, outline, or ghost style. It should support disabled and loading states"_

```yaml
name: Button
slots:
  - { name: text, title: Button Text }
variants:
  - { id: default, title: Default }
  - { id: outline, title: Outline }
  - { id: ghost, title: Ghost }
props:
  - {
      name: variant,
      type: string,
      enum: [default, outline, ghost],
      default: default,
    }
  - { name: disabled, type: boolean, default: false }
  - { name: loading, type: boolean, default: false }
```
