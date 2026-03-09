## Why

The Data Model page currently displays entity bundles as minimal text rows inside collapsible groups (`BundleSummary` in `DeboDataModel.jsx`). Each bundle shows only a name, field count badge, and optional description in a flat layout. This makes it hard to scan and doesn't communicate the entity structure at a glance.

A proper card component would give each bundle a visual identity — showing the entity type, bundle path, description, and field count in a structured layout that matches the Designbook design language.

## What Changes

- **New UI component `DeboCard`** (`packages/storybook-addon-designbook/src/components/ui/DeboCard.jsx`) — a reusable card displaying entity/bundle information with:
  - Title (bundle name)
  - Entity type badge (colored tag, e.g., "NODE")
  - Description paragraph
  - Metadata footer with entity path and field count tags

- **Update `DeboDataModel`** to use `DeboCard` instead of `BundleSummary` for each bundle entry

- **Register in barrel exports** (`ui/index.js` and top-level `index.js`)

## Capabilities

1. **debo-card-component** — The `DeboCard` React component implementing the Figma design with `debo:` prefixed Tailwind classes and props-based data flow.
2. **debo-badge-component** — A standalone `DeboBadge` UI primitive for small colored label tags, extracted from the card's badge element for reuse across the addon.

## Impact

- **DeboDataModel** — Replaces `BundleSummary` with `DeboCard`, improving visual hierarchy
- **Reusability** — `DeboCard` is a generic UI primitive usable in any MDX page that needs to display entity-like summaries
- **No breaking changes** — additive component, existing pages continue to work
