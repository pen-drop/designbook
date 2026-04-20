---
type: component
name: logo
priority: 10
trigger:
  domain: components
---

# Blueprint: Logo

Brand mark or wordmark used in header, footer, or authentication contexts.

**Use for:** Any instance where the site's visual identity appears as a clickable or static mark. Never hardcode the image path or alt text in this blueprint — those are per-design content.

## Variants

- `full` — wordmark plus symbol (default for header)
- `mark-only` — symbol without text (compact contexts)
- `inverse` — light-on-dark variant for dark backgrounds

## Props

- `variant` — string, enum above
- `href` — string, optional (default `/` when the logo is clickable)
- `alt` — string, required when `media` slot is empty

## Slots

- `media` — `image` or `element` node providing the actual mark. No default image.
