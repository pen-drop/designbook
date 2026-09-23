---
type: data-mapping
name: pager
priority: 10
trigger:
  domain: data-mapping
filter:
  backend: drupal
---

# Blueprint: Pager Mapping

Starting point for binding a view's pager region to its own Pager SDC component, independent of
the view's `build_form`. A view's wrapper may live behind a Display Builder page config or behind a
generated presenter-template — either way, the pager binds through this same dedicated binding, not
through the view wrapper's own markup.

## The Pager Is Its Own Presenter

The generic Drupal `pager` theme hook is the only way to produce pager markup — no UI-Patterns
display config renders a pager's page-link list. So the pager path is always: generic `pager`
theme hook → Pager presenter-template (the theme-markup composition, per
`presenter-template.md`) → Pager SDC component (`components/blueprints/pager.md`), passed typed
props and slots rather than reconstructed markup.

The presenter-template composes the Pager component; it never re-derives a page-link list from raw
variables itself. Each page-link, the previous/next controls, and the current-page indicator route
into the component's props/slots as already-resolved values.

## Configurations

A pager mapping distinguishes which configuration the theme hook is producing, since the values
available differ between them:

- **Standard pager** — a full page-link list (first, previous, page numbers with ellipses, next,
  last) plus the current page.
- **Mini pager** — previous/next controls only, no enumerated page-link list.
- **Infinite-scroll pager** — a "load more" / auto-load control that requests the next result batch
  instead of navigating to a numbered page. It uses its own Pager component instance through its own
  presenter — see "Infinite Scroll vs. a Hand-Placed Load-More Control" below.
- **No pager** — the result set fits on one page (or paging is disabled); the mapping omits the
  pager region entirely rather than rendering an empty or disabled pager.

Resolve the configuration from the view/pager plugin's own setting before mapping — do not guess
from a fixed default.

## Only Map Values the Theme Hook Actually Provides

The pager preprocess supplies, at most: a heading id, a current-page indicator, a set of page-link
items (each with its target and label) split into first/previous/pages/next/last groups, and
markers for whether ellipses precede or follow the enumerated page range. A mini pager reduces that
set to previous/next only.

**Never invent a total item count, a total page count, or a "page X of Y" string when the theme
hook does not supply one.** If the source data does not carry a total, the pager mapping renders
only from the values the hook exposes — first/previous/pages/next/last links and the current
indicator — and leaves any "of N" affordance out rather than computing or guessing it.

## Infinite Scroll vs. a Hand-Placed Load-More Control

An infinite-scroll pager is a real pager configuration — it renders through its own Pager component
instance, composed by its own presenter, exactly like the standard and mini configurations. It is
not a manually authored button dropped beside a numbered pager.

A design reference showing a "load more" control alongside a standard (numbered) pager on the same
region is a design-reference conflict, not two mapping targets: a region gets exactly one pager
configuration. Never map both a standard pager's page-link list and a separately hand-placed
load-more control into the same region.
