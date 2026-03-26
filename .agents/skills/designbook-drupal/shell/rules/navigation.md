---
when:
  stages: [debo-design-system:intake]
  backend: drupal
---

# Navigation in Shell Components

Header and footer must always include a navigation component as a required slot — never hardcode nav items directly.

## Navigation Component Props

Items follow the standard Drupal menu format with `title`, `url`, `in_active_trail` (boolean, set by Drupal), and `below` (recursive array of child items).

## Variants

The navigation component must accept a `variant` prop. Required variants: `primary` (header) and `footer`. Optional: `mobile`, `sidebar`.

Breadcrumb is a separate standalone component and must not be implemented as a navigation variant.
